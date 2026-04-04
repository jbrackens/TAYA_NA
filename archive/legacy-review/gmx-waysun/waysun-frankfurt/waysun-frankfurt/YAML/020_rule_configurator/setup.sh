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
git.check_versions "git@github.com:flipadmin/gmx-waysun-rule-configurator.git" || die
## ---------------
bitwarden.login
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"


log.info 'Loading Parameters from secure vault'
log.info '  RULE_CONFIGURATOR_DB_ADDRESS'
RULE_CONFIGURATOR_DB_ADDRESS=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_DB_ADDRESS}")
log.info '  RULE_CONFIGURATOR_DB_PORT'
RULE_CONFIGURATOR_DB_PORT=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_DB_PORT}")
log.info '  RULE_CONFIGURATOR_DB_NAME'
RULE_CONFIGURATOR_DB_NAME=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_DB_NAME}")
log.info '  RULE_CONFIGURATOR_DB_USERNAME'
RULE_CONFIGURATOR_DB_USERNAME=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_DB_USERNAME}")
log.info '  RULE_CONFIGURATOR_DB_PASSWORD'
RULE_CONFIGURATOR_DB_PASSWORD=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_DB_PASSWORD}")
log.info '  RULE_CONFIGURATOR_LIQUIBASE_DB_USERNAME'
RULE_CONFIGURATOR_LIQUIBASE_DB_USERNAME=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_LIQUIBASE_DB_USERNAME}")
log.info '  RULE_CONFIGURATOR_LIQUIBASE_DB_PASSWORD'
RULE_CONFIGURATOR_LIQUIBASE_DB_PASSWORD=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_LIQUIBASE_DB_PASSWORD}")
log.info '  RULE_CONFIGURATOR_PLAY_SECRET_KEY'
RULE_CONFIGURATOR_PLAY_SECRET_KEY=$(common.get_and_encode_secret "${CFG_RULE_CONFIGURATOR_PLAY_SECRET_KEY}")
log.info "Done."
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'

k8s.combine_and_load_yaml_to_k8s $(ls -1 ./ytpl/*.ytpl)

if [[ "${CFG_ENABLE_HPA:-false}" = 'true' ]] ; then
  k8s.enable_hpa 'rule-configurator' "${CFG_REPLICAS}" "${CFG_MAX_REPLICAS:-${CFG_REPLICAS}}" "${CFG_HPA_CPU_UTILIZATION}"
fi
