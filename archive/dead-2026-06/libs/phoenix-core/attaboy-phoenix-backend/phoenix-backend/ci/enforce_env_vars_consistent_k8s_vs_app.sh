#!/usr/bin/env bash

set -u

self_dir=$(cd "$(dirname "$0")" &>/dev/null || exit; pwd -P)

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
    <("$self_dir"/list_env_vars_referenced_from_paths_matching_regex.sh "$1") \
    <("$self_dir"/list_env_vars_referenced_from_paths_matching_regex.sh "$2") \
  | grep --extended-regexp --line-regexp --invert-match "$exceptions"
  # We want to succeed if no lines are found by grep (exit code 1), and fail if any line is found (exit code 0).

  if [[ $? -ne 1 ]]; then
    echo "The above env vars are referenced/defined in at least one file under '$1', but never defined/referenced in any file under '$2'."
    echo 'Consider checking for typo/programmer error, or adding a whitelisted exception'
    echo 'to the 3rd parameter of the relevant invocation of `list_env_vars_referenced_from_paths_matching_regex.sh` in this script.'
    exit 1
  fi
}

####
# we check "in cycle" to guarantee full coverage
# k8s .yaml -> app .conf -> k8s .yaml
####

# Check whether all env vars defined in phoenix-backend Kubernetes manifests (*.yaml)
# are actually referenced by the phoenix-backend application configs (*.conf, logback*.xml).
ensure_all_vars_from_1_are_also_in_2 \
  'deploy/helm/phoenix-backend/templates/.*\.yaml' \
  '(services|data-pipeline|core)/.*(\.conf|logback.*\.xml)' \
  'FLYWAY_.*|JAVA_OPTS'
  # allowed exceptions that are defined in k8s manifests, but never picked up by our configs, since:
  # - FLYWAY_.*: picked up by Flyway container instead
  # - JAVA_OPTS: picked up by the generated Docker runner script for phoenix-backend instead

# Check whether all env vars referenced from phoenix-backend application configs
# are actually defined in the phoenix-backend Kubernetes manifests.
ensure_all_vars_from_1_are_also_in_2 \
  '(services|data-pipeline|core)/.*(\.conf|logback.*\.xml)' \
  'deploy/helm/phoenix-backend/templates/.*\.yaml' \
  'PHOENIX_MOCK_DATA_INGESTION_ENABLED'
  # allowed exceptions that are referenced from configs, but never defined in k8s manifests, since:
  # - PHOENIX_MOCK_DATA_INGESTION_ENABLED: provided only in local runs, never on k8s

# Check whether all env vars referenced from README
# are actually defined in the phoenix-backend application configs or k8s-operations scripts.
ensure_all_vars_from_1_are_also_in_2 \
  'README\.md' \
  '(.*\.conf)|(k8s-operations/.*\.sh)' \
  'API_HOST|HEAVY_PASSWORD|POST_GAME'
  # these exceptions are placeholders or enum values

# Check whether all env vars referenced from .env.template
# are actually defined in the phoenix-backend application configs.
ensure_all_vars_from_1_are_also_in_2 \
  '\.env\.template' \
  '.*\.conf' \
  'MAP_WINNER|MATCH_WINNER'
  # these exceptions are enum values, not environment variables

# Check whether all env vars referenced from contract-local.env
# are actually defined in the phoenix-backend application configs.
ensure_all_vars_from_1_are_also_in_2 \
  'contract-local\.env' \
  '.*\.conf'
