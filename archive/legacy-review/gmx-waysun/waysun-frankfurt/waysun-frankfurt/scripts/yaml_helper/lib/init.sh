#!/usr/bin/env bash

set -eauo pipefail
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

source "${ENV_SCRIPT_DIR}/lib/log.sh"
source "${ENV_SCRIPT_DIR}/lib/errors.sh"
source "${ENV_SCRIPT_DIR}/lib/k8s.sh"
source "${ENV_SCRIPT_DIR}/lib/bitwarden.sh"
source "${ENV_SCRIPT_DIR}/lib/replace_secrets.sh"

ENV_TEMP_DIR=$(mktemp -d) || die

log.info "YAML script loader ${COLOR_STRONG}v0.0.1${COLOR_NORMAL}"
log.info

function init.on_exit() {
  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
  log.info "Starting clean up script."
  cd "${ENV_CURRENT_DIR}"
  log.info 'CWD restored.'
  if [ -d "${ENV_TEMP_DIR}" ] ; then
    rm -rf "${ENV_TEMP_DIR}"
    log.info "Removed ${ENV_TEMP_DIR}"
  fi
  log.info "Done"
}
trap "{ log.error 'Catch signal ${COLOR_STRONG} SIGINT'; exit 250 ;}" SIGINT
trap "{ log.error 'Catch signal ${COLOR_STRONG} SIGTERM'; exit 250 ;}" SIGTERM
trap "{ log.error 'Catch signal ${COLOR_STRONG} ERR'; exit 250 ;}" ERR
trap "{ log.error 'Catch signal ${COLOR_STRONG} ABRT'; exit 250 ;}" ABRT
trap "{ log.info 'Goodbye'; init.on_exit ; }" EXIT


log.info "Using this configuration:"
for ii in $(declare -p | grep ^ENV_) ; do
  log.info "  ${ii}"
done
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
log.info

function init.show_parameters() {
  log.info "Using this parameters:"
  while IFS= read -r ii; do
    log.info "  ${ii}"
    if [[ "${ii}" == *undefined ]] ; then
      log.error "'undefined' variable found! Set it for environment you are trying to load !"
      exit "${ERR_UNKNOWN_CONFIG_VARIABLE}"
    fi
  done <<< "$(declare -p | grep ^CFG_)"
}
