#!/usr/bin/env bash
# Set up DeepSeek Harness with Organon, from a DSH source clone:
#   - checks the prerequisites (node, pnpm, git)
#   - clones, pins and builds the DSH clone when it is missing or on another version
#   - links Organon's five packages (worker, organon-preset, loop, memory, evolve) into a profile
#   - optionally points the loop at a Python for the task evaluators (--python)
#   - checks that the profile composes with Organon mode in it
# Task evaluators and their Python packages are not installed here: prepare the Python
# a benchmark needs yourself, then pass it with --python or keep it first on PATH.
#
# Usage: bash setup.sh [--python <path to python>]
# Environment: DSH_REPO (default ~/deepseek-harness), DSH_HOME (default ~/.dsh),
#              PROFILE (default web), DSH_REF (default dsh-v0.2.1-rc.2)
# DSH is always cloned and fetched from upstream, github.com/deepseek-ai/deepseek-harness.
# Safe to run again.

set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_REPO="${DSH_REPO:-$HOME/deepseek-harness}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
export DSH_HOME
PROFILE="${PROFILE:-web}"
# The harness version Organon is built and tested against, and the tag that carries it.
BUILT_AGAINST="0.2.1-rc.2"
DSH_REF="${DSH_REF:-dsh-v0.2.1-rc.2}"
# DSH always comes from upstream, never from a fork.
DSH_REMOTE="https://github.com/deepseek-ai/deepseek-harness.git"
# Folders under organon/agent/.
PACKAGES=(plugins/worker plugins/organon-preset plugins/loop plugins/memory evolve)
OLD_PACKAGES=(dsh-candidate-builder dsh-evolve-loop dsh-dirspawn)
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
BEGIN_MARK="# organon setup: begin (written by setup.sh; run it again to change)"
END_MARK="# organon setup: end"

PYTHON=""
while [ $# -gt 0 ]; do
  case "$1" in
    --python) [ $# -ge 2 ] || { echo "setup: --python needs a path" >&2; exit 1; }; PYTHON="$2"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "setup: unknown argument $1 (see --help)" >&2; exit 1 ;;
  esac
done

fail() { echo "setup: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "$1 not found on PATH. $2"; }
# Run the clone's own CLI, exactly as `pnpm dsh ...` from the clone, so another dsh on PATH never runs.
dsh_clone() { (cd "$DSH_REPO" && pnpm --silent dsh "$@"); }
clone_version() { node -p 'require(process.argv[1]).version' "$DSH_REPO/apps/cli/package.json"; }

echo "== 1/5 checks"
need node "Install Node.js 24 (the harness needs ^22.19.0 or >=24.0.0)."
need pnpm "Install pnpm, e.g.: npm install -g pnpm"
need git "Install git, e.g.: sudo apt install git"
node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a >= 24 || (a === 22 && b >= 19) ? 0 : 1)' \
  || fail "Node $(node -v) is too old: the harness needs ^22.19.0 or >=24.0.0."
if [ -n "$PYTHON" ]; then
  "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null \
    || fail "--python $PYTHON does not run, or is older than Python 3.9."
  PYTHON="$(command -v "$PYTHON" 2>/dev/null || echo "$PYTHON")"
fi
# Another dsh on PATH (for example a global npm install) may start instead of the clone.
while IFS= read -r other; do
  [ -n "$other" ] || continue
  echo "setup: warning: another dsh is on your PATH: $other" >&2
  echo "       setup uses the clone; start DSH from it (command printed at the end), or make 'dsh' run the clone." >&2
  echo "       A global npm install is removed with: npm uninstall -g @deepseek-ai/dsh" >&2
done < <(type -ap dsh 2>/dev/null || true)
node -v | sed 's/^/node /'; echo "pnpm $(pnpm -v)"; git --version

echo "== 2/5 DSH clone -> $DSH_REPO (Organon targets $BUILT_AGAINST)"
needs_build=0
if [ ! -f "$DSH_REPO/apps/cli/package.json" ]; then
  if [ -e "$DSH_REPO" ] && [ -n "$(ls -A "$DSH_REPO" 2>/dev/null)" ]; then
    fail "$DSH_REPO exists but is not a DeepSeek Harness clone. Move it aside, or set DSH_REPO to your clone."
  fi
  echo "-- cloning $DSH_REMOTE"
  git clone --quiet "$DSH_REMOTE" "$DSH_REPO"
  needs_build=1
fi
[ -d "$DSH_REPO/.git" ] || fail "$DSH_REPO is not a git clone, so setup cannot check that it is upstream's $DSH_REF."
# The tag always comes from upstream itself, whatever the clone's origin is; upstream's
# tag replaces a same-named tag from elsewhere (a fork).
git -C "$DSH_REPO" fetch --quiet --no-tags "$DSH_REMOTE" "+refs/tags/$DSH_REF:refs/tags/$DSH_REF" \
  || fail "could not fetch $DSH_REF from $DSH_REMOTE."
want="$(git -C "$DSH_REPO" rev-parse "refs/tags/$DSH_REF^{commit}")"
if [ "$(git -C "$DSH_REPO" rev-parse HEAD)" != "$want" ]; then
  [ -z "$(git -C "$DSH_REPO" status --porcelain)" ] \
    || fail "the clone at $DSH_REPO is not at upstream's $DSH_REF and has local changes. Commit or stash them, then run setup.sh again."
  was="$(git -C "$DSH_REPO" rev-parse --abbrev-ref HEAD)"
  if [ "$was" = "HEAD" ]; then was="$(git -C "$DSH_REPO" rev-parse --short HEAD)"; fi
  echo "-- switching the clone from $was to upstream's $DSH_REF; to go back: git -C $DSH_REPO checkout $was"
  git -C "$DSH_REPO" -c advice.detachedHead=false checkout --quiet "$want" \
    || fail "could not check out $DSH_REF in $DSH_REPO"
  needs_build=1
fi
version="$(clone_version)"
[ "$version" = "$BUILT_AGAINST" ] || fail "upstream's $DSH_REF reports $version, not $BUILT_AGAINST."
if [ ! -d "$DSH_REPO/node_modules" ] || [ ! -f "$DSH_REPO/apps/cli/lib/bin.js" ]; then
  needs_build=1
fi
if [ "$needs_build" = "1" ]; then
  echo "-- pnpm install (the first run takes several minutes)"
  (cd "$DSH_REPO" && pnpm install)
  echo "-- pnpm run build"
  (cd "$DSH_REPO" && pnpm run build)
fi
[ -f "$DSH_REPO/apps/cli/lib/bin.js" ] \
  || fail "the clone did not build: $DSH_REPO/apps/cli/lib/bin.js is missing. In $DSH_REPO, run: pnpm install && pnpm run build"
echo "-- DSH $version at $DSH_REPO, installed and built"

echo "== 3/5 Organon -> profile '$PROFILE' ($PROFILE_DIR)"
for pkg in "${OLD_PACKAGES[@]}"; do
  if [ -f "$PROFILE_DIR/package.json" ] && grep -q "\"$pkg\"" "$PROFILE_DIR/package.json"; then
    echo "-- removing the old $pkg"
    dsh_clone plugin --profile "$PROFILE" remove "$pkg"
  fi
done
for pkg in "${PACKAGES[@]}"; do
  dir="$KIT/organon/agent/$pkg"
  [ -f "$dir/package.json" ] || fail "missing $dir"
  echo "-- linking $dir"
  # The memory package has no bundle of its own (the Organon preset mounts it); DSH warns about that.
  dsh_clone plugin --profile "$PROFILE" add "$dir" 2>&1 | grep -v -E '^\s*$' | sed 's/^/   /' || true
done

if [ -n "$PYTHON" ]; then
  echo "-- the loop runs evaluators with $PYTHON"
  patch="$PROFILE_DIR/cordis.patch.yml"
  if [ -f "$patch" ]; then
    awk -v b="$BEGIN_MARK" -v e="$END_MARK" '$0 == b { skip = 1; next } $0 == e { skip = 0; next } !skip' "$patch" > "$patch.tmp"
  else
    echo "# Your patch layer for this dsh profile, applied after every bundle layer." > "$patch.tmp"
  fi
  {
    echo "$BEGIN_MARK"
    echo "- id: organon-loop"
    echo "  name: '@organon/loop'"
    echo "  config:"
    echo "    python: '$PYTHON'"
    echo "$END_MARK"
  } >> "$patch.tmp"
  mv "$patch.tmp" "$patch"
fi

echo "== 4/5 check"
config="$(dsh_clone --profile "$PROFILE" --dump-config 2>/dev/null)" || fail "DSH could not compose the '$PROFILE' profile."
for want in "name: Organon mode" "name: Mutator" "'@organon/loop'" "'@organon/worker'"; do
  grep -qF "$want" <<<"$config" || fail "the composed profile lacks $want."
done
echo "-- the profile composes, with Organon mode, the Mutator worker preset, the loop and the workers"

echo "== 5/5 done"
cat <<EOF
Start DSH from the clone:

  cd "$DSH_REPO" && DSH_HOME="$DSH_HOME" pnpm dsh web

Then, for a run: open a new session in a task folder (for example $KIT/tasks/kernel_builder),
choose Organon mode, and give the budget, e.g. "Run this task with a budget of 30 candidates."
Evaluators run with ${PYTHON:-python from PATH}; the Python packages a task's evaluator needs are yours to install.
EOF
