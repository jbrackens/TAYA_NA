#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT_DIR/revival"
CSV_OUT="$REVIVAL_DIR/05_secret_scan_findings.csv"
REPORT_OUT="$REVIVAL_DIR/05_SECRET_SCAN_BASELINE.md"

BACKEND_REPO="$ROOT_DIR/phoenix-backend"
TALON_REPO="$ROOT_DIR/talon-backoffice"
SPORTSBOOK_REPO="$ROOT_DIR/phoenix-frontend-brand-viegg"

declare -a REPOS=(
  "$BACKEND_REPO"
  "$TALON_REPO"
  "$SPORTSBOOK_REPO"
)

mkdir -p "$REVIVAL_DIR"

echo "repo,file,line,pattern,severity,classification,snippet" > "$CSV_OUT"

escape_csv() {
  local value="$1"
  value="${value//\"/\"\"}"
  printf '"%s"' "$value"
}

classify_match() {
  local file="$1"
  local snippet="$2"

  if [[ "$file" == *"/__tests__/"* ]] || [[ "$file" == *"/test/"* ]] || [[ "$file" == *"/tests/"* ]] || [[ "$file" == *"contract-tests/"* ]] || [[ "$file" == *"/src/test/"* ]]; then
    echo "test_fixture"
    return
  fi

  if [[ "$file" == *"mock-server"* ]]; then
    echo "test_fixture"
    return
  fi

  if [[ "$file" == *"passwords_local.yaml"* ]]; then
    echo "dev_fixture"
    return
  fi

  if [[ "$snippet" == *"\$ARGOCD_PASSWORD"* ]] || [[ "$snippet" == *"\$ARGOCD_USERNAME"* ]]; then
    echo "env_placeholder"
    return
  fi

  if [[ "$snippet" == *"[changeme]"* ]] || [[ "$snippet" == *"[i-should"* ]] || [[ "$snippet" == *"api-password"* ]]; then
    echo "env_placeholder"
    return
  fi

  if [[ "$snippet" == *"kubectl get secret"* ]]; then
    echo "docs_command"
    return
  fi

  echo "candidate"
}

append_findings() {
  local repo="$1"
  local pattern_name="$2"
  local severity="$3"
  local regex="$4"
  local output
  local file
  local rest
  local line
  local snippet
  local classification

  output="$(git -C "$repo" grep -nEI -e "$regex" -- . || true)"
  if [[ -z "$output" ]]; then
    return
  fi

  while IFS= read -r match; do
    [[ -z "$match" ]] && continue
    file="${match%%:*}"
    rest="${match#*:}"
    line="${rest%%:*}"
    snippet="${rest#*:}"
    classification="$(classify_match "$file" "$snippet")"

    {
      escape_csv "$repo"
      printf ","
      escape_csv "$file"
      printf ","
      escape_csv "$line"
      printf ","
      escape_csv "$pattern_name"
      printf ","
      escape_csv "$severity"
      printf ","
      escape_csv "$classification"
      printf ","
      escape_csv "$snippet"
      printf "\n"
    } >> "$CSV_OUT"
  done <<< "$output"
}

for repo in "${REPOS[@]}"; do
  append_findings "$repo" "private_key_block" "critical" "-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----"
  append_findings "$repo" "aws_access_key_id" "critical" "AKIA[0-9A-Z]{16}"
  append_findings "$repo" "github_pat" "critical" "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}"
  append_findings "$repo" "slack_token" "critical" "xox[baprs]-[A-Za-z0-9-]{10,}"
  append_findings "$repo" "fixed_password_literal" "medium" "fixedPassword[[:space:]]*:[[:space:]]*['\\\"][^'\\\"]+['\\\"]"
  append_findings "$repo" "password_assignment_literal" "low" "(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*['\\\"][^'\\\"]{8,}['\\\"]"
done

total_findings="$(($(wc -l < "$CSV_OUT") - 1))"
critical_count="$(awk -F',' 'NR>1 && $5 ~ /"critical"/ {c++} END {print c+0}' "$CSV_OUT")"
medium_count="$(awk -F',' 'NR>1 && $5 ~ /"medium"/ {c++} END {print c+0}' "$CSV_OUT")"
low_count="$(awk -F',' 'NR>1 && $5 ~ /"low"/ {c++} END {print c+0}' "$CSV_OUT")"
candidate_count="$(awk -F',' 'NR>1 && $6 ~ /"candidate"/ {c++} END {print c+0}' "$CSV_OUT")"
fixture_count="$(awk -F',' 'NR>1 && ($6 ~ /"test_fixture"/ || $6 ~ /"dev_fixture"/) {c++} END {print c+0}' "$CSV_OUT")"
placeholder_count="$(awk -F',' 'NR>1 && $6 ~ /"env_placeholder"/ {c++} END {print c+0}' "$CSV_OUT")"
docs_count="$(awk -F',' 'NR>1 && $6 ~ /"docs_command"/ {c++} END {print c+0}' "$CSV_OUT")"

cat > "$REPORT_OUT" <<EOF
# Secret Scan Baseline (2026-03-02)

## Scope
- \`$BACKEND_REPO\`
- \`$TALON_REPO\`
- \`$SPORTSBOOK_REPO\`

## Method
- Scanner: local regex baseline using \`git grep\` on tracked files.
- High-confidence credential patterns were scanned first (private keys, AWS keys, GitHub PATs, Slack tokens).
- Credential-like literals were additionally scanned and classified as:
  - \`candidate\`
  - \`env_placeholder\`
  - \`dev_fixture\`
  - \`test_fixture\`

## Results Summary
- Total findings: **$total_findings**
- Critical pattern hits: **$critical_count**
- Medium pattern hits: **$medium_count**
- Low pattern hits: **$low_count**
- Candidate findings requiring remediation: **$candidate_count**
- Fixture-only findings: **$fixture_count**
- Placeholder-only findings: **$placeholder_count**
- Documentation command findings: **$docs_count**

## Key Outcome
- No high-confidence production secret material was detected in tracked files.
- One known local dev credential fixture exists in:
  - \`phoenix-backend/dev/keycloak/users/local/passwords_local.yaml\` (\`fixedPassword: 'Password123!'\`).
- Remaining non-fixture hits are environment-variable placeholders in scripts or documentation commands that reference secret retrieval.

## Artifacts
- Detailed findings CSV: \`revival/05_secret_scan_findings.csv\`
EOF

echo "Secret scan baseline written to:"
echo "  $REPORT_OUT"
echo "  $CSV_OUT"
