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
git.check_versions "git@github.com:flipadmin/gmx-waysun-event-ingestor.git" || die
## ---------------
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"

#  Commented out because we don't need it any more
#  bitwarden.login
#  log.info 'Loading Parameters from secure vault'
#  log.info '  REDIS_EVENT_INGESTOR_HOSTNAME'
#  REDIS_EVENT_INGESTOR_HOSTNAME=$(common.get_secret "${CFG_REDIS_EVENT_INGESTOR_HOSTNAME}") || die
#  log.info '  REDIS_EVENT_INGESTOR_PORT'
#  REDIS_EVENT_INGESTOR_PORT=$(common.get_secret "${CFG_REDIS_EVENT_INGESTOR_PORT}") || die
#  log.info '  REDIS_EVENT_INGESTOR_PASSWORD'
#  REDIS_EVENT_INGESTOR_PASSWORD=$(common.get_secret "${CFG_REDIS_EVENT_INGESTOR_PASSWORD}") || die
#  log.info "Done."
#  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
#  tmp_file=$(common.get_tmp_file) || die
#  k8s.compile_to_file "./etc/redisson_config.ytpl" "${tmp_file}"
#  REDISSON_CONFIG=$(cat ${tmp_file} | base64) || die

k8s.combine_and_load_yaml_to_k8s $(ls -1 ./ytpl/*.ytpl)

if [[ "${CFG_ENABLE_HPA:-false}" = 'true' ]] ; then
  k8s.enable_hpa 'event-ingestor' "${CFG_REPLICAS}" "${CFG_MAX_REPLICAS:-${CFG_REPLICAS}}" "${CFG_HPA_CPU_UTILIZATION}"
fi


