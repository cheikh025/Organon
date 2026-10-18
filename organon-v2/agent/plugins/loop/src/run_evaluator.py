"""Score one program with a task's evaluator.

    python -B run_evaluator.py <task folder> <program file>

Loads evaluate() from <task>/evaluator/evaluator.py and calls it on a copy of
the program, under the settings in <task>/task.json: `timeout` (seconds per
attempt; a timeout ends the evaluation) and `max_retries` (how often an
exception is retried). Prints one JSON line to stdout:

    {"score": <number or null>, "error": <text or null>, "metrics": <the evaluator's result>}

The candidate failed when the evaluator's result carries a non-empty `error`,
or when the evaluator could not produce a result (timeout, exceptions on every
attempt, a result that is not a dict, a non-finite score). Otherwise the score
is `combined_score`, or the mean of the numeric metrics when it is missing.
Everything the evaluator prints goes to stderr.
"""

import importlib.util
import json
import math
import os
import shutil
import sys
import tempfile
import threading
import time
import uuid
from pathlib import Path


class EvaluationTimeout(Exception):
    """evaluate() ran past the task's timeout."""


def load_evaluate(path: Path):
    """Import the evaluator module under a unique name and return its evaluate()."""
    if str(path.parent) not in sys.path:
        sys.path.insert(0, str(path.parent))
    name = f"_organon_eval_{uuid.uuid4().hex}"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module.evaluate


def call_with_timeout(function, argument, timeout: float):
    """Call function(argument) in a daemon thread, so a late call cannot hold the process open."""
    outcome = {}

    def target():
        try:
            outcome["value"] = function(argument)
        except BaseException as error:  # noqa: BLE001 - reported as the attempt's failure
            outcome["error"] = error

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise EvaluationTimeout()
    if "error" in outcome:
        raise outcome["error"]
    return outcome["value"]


def run(function, program: Path, timeout: float, max_retries: int) -> dict:
    """Evaluate a copy of the program; return the evaluator's dict or {"error": ...}."""
    for attempt in range(max_retries + 1):
        # The copy lives in the temporary folder, the one place a sandboxed evaluator may write.
        folder = Path(tempfile.mkdtemp())
        copy = folder / f"program{program.suffix}"
        shutil.copyfile(program, copy)
        try:
            result = call_with_timeout(function, str(copy), timeout)
        except EvaluationTimeout:
            # The timed-out call may still be using its copy, so the folder stays.
            return {"error": f"evaluation timed out after {timeout:g} s"}
        except BaseException as error:  # noqa: BLE001
            shutil.rmtree(folder, ignore_errors=True)
            print(f"evaluate() failed, attempt {attempt + 1} of {max_retries + 1}: {error!r}", file=sys.stderr)
            if attempt == max_retries:
                return {"error": f"evaluate() failed: {error!r}"}
            time.sleep(1.0)
            continue
        shutil.rmtree(folder, ignore_errors=True)
        if not isinstance(result, dict):
            return {"error": f"evaluate() returned {type(result).__name__}, not a dict"}
        return result
    return {"error": "evaluate() did not run"}


def finite(value):
    """JSON-safe copy: non-finite floats become their text, other non-JSON values their str()."""
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, dict):
        return {str(key): finite(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [finite(item) for item in value]
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def outcome(metrics: dict) -> dict:
    """The score or the error for one evaluator result."""
    error = metrics.get("error")
    if error not in (None, "", False):
        return {"score": None, "error": str(error)}
    if "combined_score" in metrics:
        try:
            score = float(metrics["combined_score"])
        except (TypeError, ValueError):
            return {"score": None, "error": f"combined_score is not a number: {metrics['combined_score']!r}"}
    else:
        values = [v for v in metrics.values() if isinstance(v, (int, float)) and not isinstance(v, bool)]
        if not values:
            return {"score": None, "error": "the evaluator returned no numeric metric"}
        score = sum(values) / len(values)
    if not math.isfinite(score):
        return {"score": None, "error": f"the score is not finite: {score}"}
    return {"score": score, "error": None}


def main() -> None:
    task, program = Path(sys.argv[1]), Path(sys.argv[2])
    settings = json.loads((task / "task.json").read_text(encoding="utf-8"))
    # The result line alone goes to stdout; whatever the evaluator prints goes to stderr.
    result_stream = os.fdopen(os.dup(1), "w", encoding="utf-8")
    os.dup2(2, 1)
    function = load_evaluate(task / "evaluator" / "evaluator.py")
    metrics = run(function, program, float(settings["timeout"]), int(settings.get("max_retries", 0)))
    result = {**outcome(metrics), "metrics": finite(metrics)}
    result_stream.write(json.dumps(result) + "\n")
    result_stream.flush()
    sys.stdout.flush()
    sys.stderr.flush()
    # A timed-out attempt may still be running in its daemon thread; leave without waiting for it.
    os._exit(0)


if __name__ == "__main__":
    main()
