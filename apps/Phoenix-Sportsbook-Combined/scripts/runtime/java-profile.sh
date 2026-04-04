#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
ENV_FILE="$RUNTIME_DIR/java-profile.env"

TARGET_VERSION="${JAVA_PROFILE_VERSION:-21}"
ALLOW_FALLBACK="true"
PRINT_ENV="false"
WRITE_ENV_FILE="false"

usage() {
  cat <<'EOF'
Usage: scripts/runtime/java-profile.sh [options]

Options:
  --version <21|17|auto>  Preferred Java profile version (default: 21)
  --no-fallback           Do not fallback from Java 21 to Java 17
  --print-env             Print export lines to stdout
  --write-env-file        Write .runtime/java-profile.env for shell sourcing
  --help                  Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      TARGET_VERSION="${2:-}"
      shift 2
      ;;
    --no-fallback)
      ALLOW_FALLBACK="false"
      shift
      ;;
    --print-env)
      PRINT_ENV="true"
      shift
      ;;
    --write-env-file)
      WRITE_ENV_FILE="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

resolve_java_home() {
  local version="$1"
  local candidate=""

  if [[ -x "/usr/libexec/java_home" ]]; then
    candidate="$(/usr/libexec/java_home -v "$version" 2>/dev/null || true)"
    if [[ -n "$candidate" ]]; then
      local resolved_major
      resolved_major="$("$candidate/bin/java" -version 2>&1 | sed -n '1s/.*\"\([0-9][0-9]*\).*/\1/p')"
      if [[ "$resolved_major" == "$version" ]]; then
        echo "$candidate"
        return 0
      fi
    fi
  fi

  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    local env_major
    env_major="$("${JAVA_HOME}/bin/java" -version 2>&1 | sed -n '1s/.*\"\([0-9][0-9]*\).*/\1/p')"
    if [[ "$env_major" == "$version" ]]; then
      echo "$JAVA_HOME"
      return 0
    fi
  fi

  local java_bin
  java_bin="$(command -v java || true)"
  if [[ -n "$java_bin" ]]; then
    candidate="$(cd "$(dirname "$java_bin")/.." >/dev/null 2>&1 && pwd)"
    local path_major
    path_major="$("$candidate/bin/java" -version 2>&1 | sed -n '1s/.*\"\([0-9][0-9]*\).*/\1/p')"
    if [[ "$path_major" == "$version" ]]; then
      echo "$candidate"
      return 0
    fi
  fi
}

pick_java_home() {
  local preferred="$1"
  local home=""
  local selected=""

  if [[ "$preferred" == "auto" ]]; then
    for candidate in 21 17; do
      home="$(resolve_java_home "$candidate")"
      if [[ -n "$home" ]]; then
        selected="$candidate"
        break
      fi
    done
  else
    home="$(resolve_java_home "$preferred")"
    selected="$preferred"
    if [[ -z "$home" && "$ALLOW_FALLBACK" == "true" && "$preferred" == "21" ]]; then
      home="$(resolve_java_home "17")"
      selected="17"
    fi
  fi

  if [[ -z "$home" ]]; then
    echo "error: no compatible Java runtime found (requested=$preferred, fallback=$ALLOW_FALLBACK)." >&2
    exit 1
  fi

  echo "$selected|$home"
}

selection="$(pick_java_home "$TARGET_VERSION")"
selected_version="${selection%%|*}"
selected_home="${selection##*|}"

java_version_line="$("$selected_home/bin/java" -version 2>&1 | head -n 1 || true)"

if [[ "$WRITE_ENV_FILE" == "true" ]]; then
  mkdir -p "$RUNTIME_DIR"
  cat >"$ENV_FILE" <<EOF
export JAVA_PROFILE_VERSION="$selected_version"
export JAVA_HOME="$selected_home"
export PATH="$selected_home/bin:\$PATH"
EOF
fi

if [[ "$PRINT_ENV" == "true" ]]; then
  echo "export JAVA_PROFILE_VERSION=\"$selected_version\""
  echo "export JAVA_HOME=\"$selected_home\""
  echo "export PATH=\"$selected_home/bin:\$PATH\""
else
  echo "Selected Java profile: $selected_version"
  echo "JAVA_HOME: $selected_home"
  if [[ -n "$java_version_line" ]]; then
    echo "Version: $java_version_line"
  fi
  if [[ "$WRITE_ENV_FILE" == "true" ]]; then
    echo "Wrote env file: $ENV_FILE"
  fi
fi
