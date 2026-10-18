"""Final score of a finished ALE-Bench run: the private evaluation of its best candidate.

    <benchmark python> final_eval.py <run folder>

The run folder is <task folder>/.organon/runs/<run>. As with EvoX, the private
evaluation (private_eval.py, next to this script, on the hidden test cases) runs
once the search is over, on the best candidate in search/candidates.jsonl: the
valid candidate with the highest score. The search never sees these scores. The
output of private_eval.py is saved to final.txt in the run folder.

Only ALE-Bench tasks have a separate final evaluation; for the others the
recorded score is the final score.
"""

import json
import subprocess
import sys
from pathlib import Path


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
    completed = subprocess.run(
        [sys.executable, str(private_eval), "--program-path", str(program), "--problem-id", task.name],
        cwd=private_eval.parent, stdout=subprocess.PIPE, text=True)

    report = f"best candidate: {best['id']} (score {best['score']})\n{completed.stdout}"
    (run / "final.txt").write_text(report, encoding="utf-8")
    print(report)
    sys.exit(completed.returncode)


if __name__ == "__main__":
    main()
