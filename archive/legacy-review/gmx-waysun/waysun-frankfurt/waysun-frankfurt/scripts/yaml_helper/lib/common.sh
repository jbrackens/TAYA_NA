#!/usr/bin/env bash
set -eauo pipefail
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi
source "${ENV_SCRIPT_DIR}/lib/init.sh"

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function die {
  local error="${1:-${?}}"
  log.error "Subshell error - '${error}'"
  exit "${error}"
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function common.get_tmp_file(){
  local retval
  retval="$(mktemp ${ENV_TEMP_DIR}/tmp.XXXXXXXXX)" || die
  echo "${retval}"
}
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function common.get_secret(){
  local secret_definition="${1}"

  local secret_engine=
  local secret_key=
  local secret_param=
  local secret=

  IFS='|' read secret_engine secret_key  secret_param <<< "${secret_definition}"

  case "${secret_engine}" in
    bitwarden_file)
      secret="$(bitwarden.get_attachment "${secret_key}" "${secret_param}")" || die
      ;;
    bitwarden)
      secret="$(bitwarden.get_field "${secret_key}" "${secret_param}")" || die
      ;;
    raw)
      secret="${secret_key}"
      ;;
    *)
      log.error "'common.load_secret' received unknown engine name: '${secret_engine}'"
      die "${ERR_COMMON_UNKNOWN_ENGINE}"
  esac
  echo -n "${secret}"
}
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function common.get_and_encode_secret(){
  common.get_secret "${1}" | base64
}
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function common.usage() {
  log.info "Usage: "
  replace_secrets.usage
  log.info " "
}
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
