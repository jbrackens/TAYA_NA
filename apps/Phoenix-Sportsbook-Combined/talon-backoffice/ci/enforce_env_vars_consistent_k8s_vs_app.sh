#!/usr/bin/env bash

set -u

# List all env var names (strings of the form `ABC_123_4K9`)
# located in the files whose path relative to repository root fully matches the specified regex.
function grep_vars_in_files_matching() {
  path_regex=$1

  git ls-files \
    | grep --extended-regexp --line-regexp "$path_regex" \
    | xargs grep \
      --extended-regexp --word-regexp \
      --only-matching --no-filename \
      '[A-Z0-9]+(_[A-Z0-9]+)+' -- \
    | sort -u
}

# List env vars in files matching the two provided path regexes (A and B)
# and make sure that the non-symmetric difference between A and B
# (basically, `A - B` or the vars that are in A but not in B)
# doesn't include anything beyond the whitelisted vars.
function ensure_all_vars_from_1_are_also_in_2() {
  exceptions=${3:-no_exceptions_123456789}

  # A clearer way to match the two outputs would be to use `combine <(...) NOT <(...)`,
  # but unfortunately `combine` is non-standard (from `moreutils`) and missing on most systems by default,
  # while `comm` is included in `coreutils`.
  comm -23 \
    <(grep_vars_in_files_matching "$1") \
    <(grep_vars_in_files_matching "$2") \
  | grep --extended-regexp --line-regexp --invert-match "$exceptions"
  # We want to succeed if no lines are found by grep (exit code 1), and fail if any line is found (exit code 0).

  if [[ $? -ne 1 ]]; then
    echo "The above env vars are referenced/defined in at least one file under '$1', but never defined/referenced in any file under '$2'."
    echo 'Consider checking for typo/programmer error, or adding a whitelisted exception'
    echo 'to the 3rd parameter of the relevant invocation of ensure_all_vars_from_1_are_also_in_2 in this script.'
    exit 1
  fi
}


# Check whether all env vars listed in app .env files
# are actually defined in the phoenix-ui Kubernetes manifests.

ensure_all_vars_from_1_are_also_in_2 \
  'packages/app/\.env\.development' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'

ensure_all_vars_from_1_are_also_in_2 \
  'packages/app/\.env\.staging' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'

ensure_all_vars_from_1_are_also_in_2 \
  'packages/app/\.env\.production' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'


# Check whether all env vars listed in office .env files
# are actually defined in the phoenix-ui Kubernetes manifests.

ensure_all_vars_from_1_are_also_in_2 \
  'packages/office/\.env\.development' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'

ensure_all_vars_from_1_are_also_in_2 \
  'packages/office/\.env\.staging' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'

ensure_all_vars_from_1_are_also_in_2 \
  'packages/office/\.env\.production' \
  'deploy/helm/phoenix-ui/templates/deployment\.yaml'
