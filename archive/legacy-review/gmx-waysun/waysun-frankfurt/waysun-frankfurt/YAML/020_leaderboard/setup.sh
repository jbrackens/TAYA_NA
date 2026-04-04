#!/usr/bin/env bash
set -eauo pipefail
ENV_CURRENT_DIR=$(pwd)
ENV_SCRIPT_DIR=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
ENV_SCRIPT_TYPE=$(basename "${ENV_SCRIPT_DIR}")
ENV_ROOT_DIR=$(realpath ${ENV_SCRIPT_DIR}/..)  # <- this must pointing to directory where `.lib` is located

ENV_TYPE=${1:-'develop'}
shift || true

cd ${ENV_SCRIPT_DIR}
source ${ENV_ROOT_DIR}/.lib/common.sh
## ---------------
git.check_versions "git@github.com:flipadmin/eeg-waysun-leaderboard.git" || die
## ---------------
bitwarden.login
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"


log.info 'Loading Parameters from secure vault'

for param in LEADERBOARD_DB_ADDRESS LEADERBOARD_DB_PORT LEADERBOARD_DB_NAME \
             LEADERBOARD_DB_USERNAME LEADERBOARD_DB_PASSWORD \
             LEADERBOARD_LIQUIBASE_DB_USERNAME LEADERBOARD_LIQUIBASE_DB_PASSWORD \
             LEADERBOARD_PLAY_SECRET_KEY \
             LEADERBOARD_REDIS_HOST LEADERBOARD_REDIS_PORT \
             LEADERBOARD_REDIS_DATABASE_NUMBER LEADERBOARD_REDIS_PASSWORD ; do
  log.info "  ${param}"
  _t="CFG_${param}"
  declare $param=$(common.get_and_encode_secret "${!_t}")
done
log.info "Done."
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'

k8s.combine_and_load_yaml_to_k8s $(ls -1 ./ytpl/*.ytpl)

if [[ "${CFG_ENABLE_HPA:-false}" = 'true' ]] ; then
  k8s.enable_hpa 'leaderboard' "${CFG_REPLICAS}" "${CFG_MAX_REPLICAS:-${CFG_REPLICAS}}" "${CFG_HPA_CPU_UTILIZATION}"
fi
