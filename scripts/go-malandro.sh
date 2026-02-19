#!/usr/bin/env bash
# go-malandro: commit all changes and push to main
# Usage: ./scripts/go-malandro.sh [commit message]
# When user says "go malandro", the agent should run this script.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: not a git repository."
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit. Working tree clean."
  exit 0
fi

COMMIT_MSG="${1:-chore: update}"
git add -A
git commit -m "$COMMIT_MSG"
git push origin main

echo "Done. Committed and pushed to main."
