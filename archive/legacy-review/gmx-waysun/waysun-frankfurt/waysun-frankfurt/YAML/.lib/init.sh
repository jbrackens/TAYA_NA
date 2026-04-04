#!/usr/bin/env bash

set -eauo pipefail
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

source "$(dirname $(realpath ${BASH_SOURCE[0]}))/log.sh"
source "$(dirname $(realpath ${BASH_SOURCE[0]}))/errors.sh"
source "$(dirname $(realpath ${BASH_SOURCE[0]}))/k8s.sh"
source "$(dirname $(realpath ${BASH_SOURCE[0]}))/bitwarden.sh"
source "$(dirname $(realpath ${BASH_SOURCE[0]}))/git.sh"

ENV_CURRENT_DIR=${ENV_CURRENT_DIR:-$(pwd)} || die
ENV_SCRIPT_DIR=${ENV_SCRIPT_DIR:-$(dirname "$(realpath "${BASH_SOURCE[0]}")")} || die
ENV_SCRIPT_TYPE=${ENV_SCRIPT_TYPE:-$(basename "${ENV_SCRIPT_DIR}")} || die
ENV_TYPE=${1:-${ENV_TYPE:-'develop'}} || die
ENV_TEMP_DIR=$(mktemp -d) || die
shift || true

log.info "YAML script loader ${COLOR_STRONG}v0.0.1"
log.info "Loading script for '${COLOR_STRONG}${ENV_SCRIPT_TYPE}${COLOR_NORMAL}'@'${COLOR_STRONG}${ENV_TYPE}'"
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



log.info "Loading parameters"
for config_file in "${ENV_ROOT_DIR}/default.env" "${ENV_ROOT_DIR}/${ENV_TYPE}.env" "${ENV_SCRIPT_DIR}/default.env" "${ENV_SCRIPT_DIR}/${ENV_TYPE}.env" ; do
  if [ -f "${config_file}" ] ; then
    log.info "  - ${config_file}"
    source "${config_file}"
  fi
done
log.info


log.info "Using this parameters:"
while IFS= read -r ii; do
  log.info "  ${ii}"
  if [[ "${ii}" == *undefined ]] ; then
    log.error "'undefined' variable found! Set it for environment you are trying to load !"
    exit "${ERR_UNKNOWN_CONFIG_VARIABLE}"
  fi
done <<< "$(declare -p | grep ^CFG_)"
log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
