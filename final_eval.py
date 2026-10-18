"""Final score of a finished ALE-Bench run: the private evaluation of its best candidate.

    <benchmark python> final_eval.py <run folder>

The run folder is <task folder>/.organon/runs/<run>. As with EvoX, the private
evaluation (private_eval.py, next to this script, on the hidden test cases) runs
once the search is over, on the best candidate in search/candidates.jsonl: the
valid candidate with the highest score. The search never sees these scores. Our
#EVOLVE_START/#EVOLVE_END lines are removed from the program first. The output of
private_eval.py is saved to final.txt in the run folder.

Only ALE-Bench tasks have a separate final evaluation; for the others the
recorded score is the final score.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

MARKERS = {b"#EVOLVE_START", b"#EVOLVE_END"}


def main() -> None:
    run = Path(sys.argv[1]).resolve()
    private_eval = Path(__file__).resolve().parent / "private_eval.py"
    task = (run / json.loads((run / "run.json").read_text(encoding="utf-8"))["task"]).resolve()
    settings = json.loads((task / "task.json").read_text(encoding="utf-8"))
    rows = [json.loads(line) for line in (run / "search" / "candidates.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    valid = [row for row in rows if row.get("error") is None and isinstance(row.get("score"), (int, float))]
    best = max(valid, key=lambda row: row["score"])
    folder = run / best.get("folder", f"search/candidates/{best['id']}")
    program = folder / settings["program"]
    code = b"\n".join(line for line in program.read_bytes().split(b"\n") if line.strip() not in MARKERS)

    with tempfile.TemporaryDirectory() as scratch:
        plain = Path(scratch) / program.name
        plain.write_bytes(code)
        completed = subprocess.run(
            [sys.executable, str(private_eval), "--program-path", str(plain), "--problem-id", task.name],
            cwd=private_eval.parent, stdout=subprocess.PIPE, text=True)

    report = f"best candidate: {best['id']} (score {best['score']})\n{completed.stdout}"
    (run / "final.txt").write_text(report, encoding="utf-8")
    print(report)
    sys.exit(completed.returncode)


if __name__ == "__main__":
    main()
