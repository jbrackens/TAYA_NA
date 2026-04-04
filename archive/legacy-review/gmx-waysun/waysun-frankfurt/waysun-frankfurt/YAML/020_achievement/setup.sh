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
git.check_versions "git@github.com:flipadmin/eeg-waysun-achievement.git" || die
## ---------------
bitwarden.login
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"


for param in ACHIEVEMENT_DB_ADDRESS ACHIEVEMENT_DB_PORT ACHIEVEMENT_DB_NAME \
             ACHIEVEMENT_DB_USERNAME ACHIEVEMENT_DB_PASSWORD \
             ACHIEVEMENT_LIQUIBASE_DB_USERNAME ACHIEVEMENT_LIQUIBASE_DB_PASSWORD \
             ACHIEVEMENT_PLAY_SECRET_KEY \
             ACHIEVEMENT_REDIS_HOST ACHIEVEMENT_REDIS_PORT \
             ACHIEVEMENT_REDIS_DATABASE_NUMBER ACHIEVEMENT_REDIS_PASSWORD ; do
  log.info "  ${param}"
  _t="CFG_${param}"
  _t=$(common.get_and_encode_secret "${!_t}") || die
  declare $param="${_t}"
done
log.info "Done."
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'

k8s.combine_and_load_yaml_to_k8s $(ls -1 ./ytpl/*.ytpl)

if [[ "${CFG_ENABLE_HPA:-false}" = 'true' ]] ; then
  k8s.enable_hpa 'achievement' "${CFG_REPLICAS}" "${CFG_MAX_REPLICAS:-${CFG_REPLICAS}}" "${CFG_HPA_CPU_UTILIZATION}"
fi

