#!/usr/bin/env bash
set -eauo pipefail
ENV_CURRENT_DIR=$(pwd)
ENV_SCRIPT_DIR=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
source ${ENV_SCRIPT_DIR}/lib/common.sh
## --------------------------------------------------------
if [[ "${#}" -eq 0  ]] ; then
  common.usage
  exit "${ERR_EXECUTION_WRONG_PARAMETERS}"
fi

case "${1}" in
  replace_secrets)
    log.info "Validating input parameters for 'replace_secrets'"
    replace_secrets.validate ${*}
    log.info "   OK"
    shift
    replace_secrets ${*}
    ;;
  --help)
    common.usage;;
  help)
    common.usage;;
  *)
    common.usage;;
esac
