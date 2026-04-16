#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOKS_PATH="$ROOT_DIR/.githooks"
PRE_PUSH_HOOK="$HOOKS_PATH/pre-push"

if [[ ! -f "$PRE_PUSH_HOOK" ]]; then
  echo "error: expected pre-push hook at $PRE_PUSH_HOOK" >&2
  exit 1
fi

chmod +x "$PRE_PUSH_HOOK"
git -C "$ROOT_DIR" config core.hooksPath "$HOOKS_PATH"

echo "Installed private governance hooks."
echo "- repo: $ROOT_DIR"
echo "- hooksPath: $HOOKS_PATH"
echo "- active pre-push hook: $PRE_PUSH_HOOK"
echo "- note: hook enforces only when git push is executed from within $ROOT_DIR"
