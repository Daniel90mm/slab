#!/usr/bin/env bash
# setup.sh — finish scaffolding after a manual `cp -r` of the template.
#
# Usage:
#   ./scripts/setup.sh [name]
#
# If [name] is omitted, uses the current directory name.
# Idempotent: safe to run twice. Skips steps that are already done.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
NAME="${1:-$(basename "$ROOT")}"

# 1. Fill slab-vscode placeholder (the script path) and the <your-project-name>
#    placeholder (the _template-standard fallback path).
for pat in 'slab-vscode' '<your-project-name>'; do
    files="$(grep -rl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv -F "$pat" . 2>/dev/null || true)"
    if [[ -n "$files" ]]; then
        echo "$files" | xargs sed -i "s|${pat}|${NAME}|g"
        echo "setup: replaced '${pat}' → '${NAME}'"
    fi
done

# 2. Initialize git if needed.
if [[ ! -d .git ]]; then
    git init -q -b main
    echo "setup: git initialized"
else
    echo "setup: git already initialized, skipping"
fi

# 3. Point at project-local hooks.
if [[ -d .githooks ]]; then
    git config core.hooksPath .githooks
    echo "setup: hooks path set to .githooks"
fi

# 4. Initial commit if no commits exist yet.
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    # Remove the TEMPLATE_README if this was a fallback cp -r.
    [[ -f TEMPLATE_README.md ]] && rm TEMPLATE_README.md
    git add -A
    git commit -q -m "Initial scaffold"
    echo "setup: initial commit created"
else
    echo "setup: commits already exist, skipping initial commit"
fi

echo "setup: done. Project '${NAME}' ready."
