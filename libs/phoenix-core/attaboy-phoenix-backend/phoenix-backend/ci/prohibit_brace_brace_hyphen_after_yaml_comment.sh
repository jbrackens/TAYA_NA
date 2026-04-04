#!/usr/bin/env bash

set -e -o pipefail -u

awk_script="$(cat <<'EOF'

  BEGIN { exit_code = 0 }

  FNR == 1 { prev_non_empty = "" }

  ( prev_non_empty ~ /#/ ) && ( $0 ~ /^ *{{-/ ) {
    print FILENAME ":" FNR ": a {{- style action should NEVER follow a YAML comment" \
      " since this is likely to concat a subsequent line into this comment; consider {{ style action instead"
    exit_code = 1
  }

  /^.+$/ { prev_non_empty = $0 }

  END { exit exit_code }

EOF
)"

git ls-files '*.yaml' | grep -v k8s-operations/users/ | xargs awk "$awk_script"
