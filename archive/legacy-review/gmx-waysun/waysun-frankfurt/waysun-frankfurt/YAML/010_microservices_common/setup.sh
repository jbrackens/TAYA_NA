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
bitwarden.login
k8s.create_namespace_if_not_exists "${CFG_K8S_NAMESPACE}"

## ---------------
log.info 'Loading Parameters from secure vault'
log.info '  SECRET_BOX_HEX_KEY'
SECRET_BOX_HEX_KEY=$(common.get_and_encode_secret "${CFG_SECRET_BOX_HEX_KEY}")
log.info "Done."
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'

k8s.combine_and_load_yaml_to_k8s $(ls -1 ./ytpl/*.ytpl)


