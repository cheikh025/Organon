"""Fixture evaluator, shaped like a benchmark one: evaluate(program_path) -> metrics.

Runs the program and scores the number it prints. A program that fails or
prints no number reports an error.
"""

import subprocess
import sys


def evaluate(program_path):
    print("fixture evaluator: running the program")  # goes to the runner's stderr
    completed = subprocess.run([sys.executable, program_path], capture_output=True, text=True, timeout=60)
    text = completed.stdout.strip()
    try:
        value = float(text)
    except ValueError:
        return {"combined_score": 0.0, "error": completed.stderr[-500:] or f"printed {text!r}, not a number"}
    return {"combined_score": value, "printed": text}
