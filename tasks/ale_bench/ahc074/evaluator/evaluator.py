"""AHC074 (Layered Barcode Display) evaluator.

Compiles the C++ program with the flags in config.json, then plays every input in ./in/ (the
official seeds 0-99) through the official interactive tester, one tester process per case and
several cases at once. The absolute score of a case is 2KE + T (lower is better); the result's
combined_score is minus the mean absolute score, so higher is better for the search.

The candidate fails, with the reason in `error`, when the program
- does not compile;
- names a file, directory or command API (the judge gives input only on standard input);
- is judged invalid by the tester, or ends abnormally, on any case;
- takes longer than time_limit_s on any case (wall clock, measured around the tester).

The tester comes from ./tools/ (the official Rust source): ./tools/target/release/tester, built
with `cargo build -r --manifest-path tools/Cargo.toml`, or on Windows the official binary in
./bin/windows/.
"""

import json
import os
import re
import signal
import statistics
import subprocess
import sys
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
WINDOWS = sys.platform == "win32"

# APIs that reach files, directories or other programs. The judge gives input only on stdin, so a
# program that opens files can only be reading the test inputs on this machine.
FORBIDDEN = re.compile(
    r"\b(fopen|freopen|fstream|ifstream|ofstream|filesystem|opendir|readdir|scandir|popen|system|"
    r"CreateFile[AW]?|FindFirstFile[AW]?|ShellExecute[AW]?|CreateProcess[AW]?|execv|execl|execvp|fork)\b"
)
SCORE_LINE = re.compile(r"^Score = (-?\d+)\s*$")


def tester() -> Path:
    """The official tester binary: a local cargo build first, then the Windows binary."""
    name = "tester.exe" if WINDOWS else "tester"
    candidates = [HERE / "tools" / "target" / "release" / name]
    if WINDOWS:
        candidates.append(HERE / "bin" / "windows" / "tester.exe")
    for path in candidates:
        if path.is_file():
            return path
    raise RuntimeError(
        "no tester binary: build it with `cargo build -r --manifest-path "
        f"{HERE / 'tools' / 'Cargo.toml'}` (needs Rust)"
    )


def strip_comments(source: str) -> str:
    """The source without // and /* */ comments, so a comment cannot trip the API check."""
    source = re.sub(r"/\*.*?\*/", " ", source, flags=re.S)
    return re.sub(r"//[^\n]*", " ", source)


def compile_program(source: Path, folder: Path) -> Path:
    exe = folder / (f"solution_{uuid.uuid4().hex[:8]}" + (".exe" if WINDOWS else ""))
    command = [part.replace("{src}", str(source)).replace("{exe}", str(exe)) for part in CONFIG["compile"]]
    result = subprocess.run(command, capture_output=True, text=True, timeout=300)
    if result.returncode != 0 or not exe.is_file():
        raise CompileError((result.stderr or result.stdout).strip()[-3000:])
    return exe


class CompileError(Exception):
    pass


def kill_tree(process: subprocess.Popen) -> None:
    """Stop the tester and the program it started."""
    try:
        if WINDOWS:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)
        else:
            os.killpg(process.pid, signal.SIGKILL)
    except (OSError, ProcessLookupError):
        pass


def run_case(tester_path: Path, exe: Path, case: Path, workdir: Path) -> dict:
    """Play one input through the tester; returns seed, score, time and the tester's error, if any."""
    seed = int(case.stem)
    hard = float(CONFIG["hard_timeout_s"])
    with case.open("rb") as stdin:
        start = time.perf_counter()
        process = subprocess.Popen(
            [str(tester_path), str(exe)],
            stdin=stdin,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            cwd=workdir,
            **({} if WINDOWS else {"start_new_session": True}),
        )
        try:
            _, err = process.communicate(timeout=hard)
        except subprocess.TimeoutExpired:
            kill_tree(process)
            process.communicate()
            return {"seed": seed, "score": None, "time": hard, "error": f"no result after {hard:g} s"}
        elapsed = time.perf_counter() - start
    lines = [line.rstrip() for line in err.decode("utf-8", "replace").splitlines() if line.strip()]
    score_at = next((i for i in range(len(lines) - 1, -1, -1) if SCORE_LINE.match(lines[i])), None)
    if score_at is None:
        return {"seed": seed, "score": None, "time": elapsed, "error": "the tester reported no score: " + " | ".join(lines[-3:])}
    score = int(SCORE_LINE.match(lines[score_at]).group(1))
    # The tester prints the reason of an invalid output, then "Score = 0", and exits 1 when the
    # program ended abnormally.
    if process.returncode != 0 or (score == 0 and score_at > 0):
        reason = lines[score_at - 1] if score_at > 0 else f"tester exit code {process.returncode}"
        return {"seed": seed, "score": None, "time": elapsed, "error": reason}
    return {"seed": seed, "score": score, "time": elapsed, "error": None}


def evaluate(program_path):
    source = Path(program_path)
    code = source.read_text(encoding="utf-8", errors="replace")
    found = FORBIDDEN.search(strip_comments(code))
    if found:
        return {"error": f"the program uses {found.group(1)}: it may not reach files or other programs; "
                         "the judge gives input only on standard input"}
    cases = sorted((HERE / CONFIG["inputs"]).glob("*.txt"))
    if not cases:
        return {"error": f"no inputs in {HERE / CONFIG['inputs']}"}
    limit = float(CONFIG["time_limit_s"])
    workers = CONFIG.get("workers") or max(1, (os.cpu_count() or 2) // 2)

    with tempfile.TemporaryDirectory(prefix="ahc074_") as folder:
        workdir = Path(folder)
        try:
            exe = compile_program(source, workdir)
        except CompileError as error:
            return {"error": f"compile error:\n{error}"}
        tester_path = tester()
        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(pool.map(lambda case: run_case(tester_path, exe, case, workdir), cases))

    times = [r["time"] for r in results]
    metrics = {
        "cases": len(results),
        "max_time_s": round(max(times), 3),
        "mean_time_s": round(statistics.mean(times), 3),
        "time_limit_s": limit,
        "workers": workers,
    }
    failed = [r for r in results if r["error"] is not None]
    slow = [r for r in results if r["error"] is None and r["time"] > limit]
    if failed or slow:
        details = [f"seed {r['seed']}: {r['error']}" for r in failed[:5]]
        details += [f"seed {r['seed']}: {r['time']:.2f} s, over the {limit:g} s limit" for r in slow[:5]]
        return {**metrics, "failed_cases": len(failed), "slow_cases": len(slow),
                "error": f"{len(failed)} invalid and {len(slow)} too slow of {len(results)} cases: " + "; ".join(details)}

    scores = {r["seed"]: r["score"] for r in results}
    mean = statistics.mean(scores.values())
    worst = sorted(scores, key=scores.get, reverse=True)[:5]
    return {
        **metrics,
        "combined_score": -mean,
        "mean_absolute_score": mean,
        "median_absolute_score": statistics.median(scores.values()),
        "worst_cases": {str(seed): scores[seed] for seed in worst},
        "case_scores": {str(seed): score for seed, score in sorted(scores.items())},
    }


if __name__ == "__main__":
    print(json.dumps(evaluate(sys.argv[1] if len(sys.argv) > 1 else HERE.parent / "solution.cpp"), indent=2))
