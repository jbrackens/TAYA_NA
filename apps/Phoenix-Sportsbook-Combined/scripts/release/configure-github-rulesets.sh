#!/bin/bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  configure-github-rulesets.sh <owner/repo> [options]

Options:
  --release-branch-pattern <pattern>   Release branch glob (default: release/*)
  --release-tag-pattern <pattern>      Release tag glob; may be repeated (defaults: release-*, v*)
  --enforcement <active|evaluate>      Ruleset enforcement mode (default: active)
  --include-runtime-profile-checks     Also require runtime-profile workflow checks
  --dry-run                            Print payloads without calling GitHub API
  -h, --help                           Show this help

This script upserts two repository rulesets:
1. Branch ruleset for release branches requiring key status checks
2. Tag ruleset for release tags requiring release-gate status checks

Required status checks enforced on release branches:
- Release Gates / Phase 9 Launch Readiness Gate
- Verify Go Parity / verify-go
- Verify Frontends / verify-sportsbook
- Verify Frontends / verify-talon

When --include-runtime-profile-checks is set, release branch checks also include:
- Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness

Required status checks enforced on release tags:
- Release Gates / Phase 9 Launch Readiness Gate

When --include-runtime-profile-checks is set, release tag checks also include:
- Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -eq 0 ]]; then
  usage
  exit 0
fi

REPO_SLUG="$1"
shift

RELEASE_BRANCH_PATTERN="release/*"
RELEASE_TAG_PATTERNS=("release-*" "v*")
ENFORCEMENT="active"
DRY_RUN=false
INCLUDE_RUNTIME_PROFILE_CHECKS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-branch-pattern)
      RELEASE_BRANCH_PATTERN="$2"
      shift 2
      ;;
    --release-tag-pattern)
      RELEASE_TAG_PATTERNS+=("$2")
      shift 2
      ;;
    --enforcement)
      ENFORCEMENT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --include-runtime-profile-checks)
      INCLUDE_RUNTIME_PROFILE_CHECKS=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$ENFORCEMENT" != "active" && "$ENFORCEMENT" != "evaluate" ]]; then
  echo "error: --enforcement must be active or evaluate" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]]; then
  gh auth status >/dev/null
fi

probe_ruleset_feature_access() {
  local probe_output

  if probe_output="$(gh api "repos/$REPO_SLUG/rulesets" 2>&1)"; then
    return 0
  fi

  if grep -qi "Upgrade to GitHub Pro or make this repository public" <<<"$probe_output"; then
    cat >&2 <<EOF
error: ruleset APIs are blocked for '$REPO_SLUG' under current private-repo plan.
resolution:
  1) Enable private-repo rulesets (GitHub Pro), or
  2) Temporarily switch repository visibility to public and rerun this script.
private fallback:
  - make release-install-private-governance-hooks
  - make release-governance-private
EOF
    exit 2
  fi

  echo "error: failed to query rulesets for '$REPO_SLUG'" >&2
  echo "$probe_output" >&2
  exit 1
}

if [[ "$DRY_RUN" != "true" ]]; then
  probe_ruleset_feature_access
fi

branch_checks=(
  "Release Gates / Phase 9 Launch Readiness Gate"
  "Verify Go Parity / verify-go"
  "Verify Frontends / verify-sportsbook"
  "Verify Frontends / verify-talon"
)

tag_checks=(
  "Release Gates / Phase 9 Launch Readiness Gate"
)

if [[ "$INCLUDE_RUNTIME_PROFILE_CHECKS" == "true" ]]; then
  branch_checks+=(
    "Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness"
  )
  tag_checks+=(
    "Release Runtime Profile Gates / Phase 9 Runtime Profile Launch Readiness"
  )
fi

unique_tag_patterns=()
for pattern in "${RELEASE_TAG_PATTERNS[@]:-}"; do
  skip=false
  for existing in "${unique_tag_patterns[@]:-}"; do
    if [[ "$existing" == "$pattern" ]]; then
      skip=true
      break
    fi
  done
  if [[ "$skip" == "false" ]]; then
    unique_tag_patterns+=("$pattern")
  fi
done
if [[ ${#unique_tag_patterns[@]} -eq 0 ]]; then
  RELEASE_TAG_PATTERNS=("release-*" "v*")
else
  RELEASE_TAG_PATTERNS=("${unique_tag_patterns[@]}")
fi

json_array_from_lines() {
  jq -nR '[inputs | select(length > 0)]'
}

build_status_checks_json() {
  printf '%s\n' "$@" | jq -nR '[inputs | select(length > 0) | {context: ., integration_id: null}]'
}

branch_includes_json="$(printf 'refs/heads/%s\n' "$RELEASE_BRANCH_PATTERN" | json_array_from_lines)"
tag_includes_json="$(printf 'refs/tags/%s\n' "${RELEASE_TAG_PATTERNS[@]}" | json_array_from_lines)"
branch_checks_json="$(build_status_checks_json "${branch_checks[@]}")"
tag_checks_json="$(build_status_checks_json "${tag_checks[@]}")"

build_ruleset_payload() {
  local name="$1"
  local target="$2"
  local includes_json="$3"
  local checks_json="$4"

  jq -n \
    --arg name "$name" \
    --arg target "$target" \
    --arg enforcement "$ENFORCEMENT" \
    --argjson includes "$includes_json" \
    --argjson checks "$checks_json" \
    '{
      name: $name,
      target: $target,
      enforcement: $enforcement,
      conditions: {
        ref_name: {
          include: $includes,
          exclude: []
        }
      },
      rules: [
        {
          type: "required_status_checks",
          parameters: {
            strict_required_status_checks_policy: true,
            do_not_enforce_on_create: false,
            required_status_checks: $checks
          }
        }
      ],
      bypass_actors: []
    }'
}

upsert_ruleset() {
  local name="$1"
  local target="$2"
  local payload="$3"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] UPSERT ruleset '$name' (target=$target) on repos/$REPO_SLUG/rulesets"
    echo "$payload" | jq .
    return 0
  fi

  local ruleset_id
  local rulesets_json
  rulesets_json="$(gh api "repos/$REPO_SLUG/rulesets" --paginate)"
  ruleset_id="$(jq -r ".[] | select(.name == \"$name\" and .target == \"$target\") | .id" <<<"$rulesets_json" | head -n1)"

  if [[ -n "$ruleset_id" ]]; then
    echo "$payload" | gh api --method PATCH "repos/$REPO_SLUG/rulesets/$ruleset_id" --input - >/dev/null
    echo "updated ruleset: $name ($target, id=$ruleset_id)"
    return 0
  fi

  echo "$payload" | gh api --method POST "repos/$REPO_SLUG/rulesets" --input - >/dev/null
  echo "created ruleset: $name ($target)"
}

branch_payload="$(build_ruleset_payload "Phoenix Release Branch Gates" "branch" "$branch_includes_json" "$branch_checks_json")"
tag_payload="$(build_ruleset_payload "Phoenix Release Tag Gates" "tag" "$tag_includes_json" "$tag_checks_json")"

upsert_ruleset "Phoenix Release Branch Gates" "branch" "$branch_payload"
upsert_ruleset "Phoenix Release Tag Gates" "tag" "$tag_payload"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "dry-run complete"
fi
