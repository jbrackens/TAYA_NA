#!/usr/bin/env bash
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

# clean the session
BW_SESSION=

function bitwarden.login(){
  log.info "BitWarden - login started"
  if bw unlock --check --raw 2>/dev/null; then
    log.warning 'BitWarden session valid - skipping '
    log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
    return
  fi
  bw logout > /dev/null 2>&1 || true  # I must log out to force taking a new vault values
  log.info "BitWarden - trying to log in"
  bw login --apikey --raw > /dev/null
  log.info "Success."
  log.info "BitWarden - unlocking Vault"
  BW_SESSION="$(bw unlock --passwordenv BW_PASSWORD --raw)" || die
  log.info "Success."
  log.info '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
}

function bitwarden.get(){
  local key_name=${1:-}
  if [ x"${key_name}" = 'x' ] ; then
    log.error "Wrong parameters for bitwarden.get(key_name, field_name): "
    log.error "    key_name = '${key_name}"
    log.error "    field_name = '${field_name}"
    exit "${ERR_BITWARDEN_WRONG_GET_PARAMS}"
  fi
  bw get item "${key_name}"
}
function bitwarden.get_field(){
  local key_name=${1:-}
  local field_name=${2:-}
  if [ x"${key_name}" = 'x' ] || [ x"${field_name}" = 'x' ] ; then # changed the -or to ||
    log.error "Wrong parameters for bitwarden.get_field(key_name, field_name): "
    log.error "    key_name = '${key_name}"
    log.error "    field_name = '${field_name}"
    exit "${ERR_BITWARDEN_WRONG_GET_PARAMS}"
  fi

  local RET_VAL=
  RET_VAL=$(bitwarden.get "${key_name}"  | jq -r ".fields[] | select (.name == \"${field_name}\").value") || die
  if [ x"${RET_VAL}" = 'x' ] ; then
    log.error "Unknown value for a 'field_name' inside 'key_name' for bitwarden.get(key_name, field_name): "
    log.error "    key_name = '${key_name}'"
    log.error "    field_name = '${field_name}'"
    exit "${ERR_BITWARDEN_UNKNOWN_FIELD_VALUE}"
  fi
  echo -n "${RET_VAL}"
}

function bitwarden.get_attachment(){
  local key_name=${1:-}
  local file_name=${2:-}
  if [ x"${key_name}" = 'x' ] || [ x"${file_name}" = 'x' ] ; then # changed the -or to ||
    log.error "Wrong parameters for bitwarden.get_attachment(key_name, file_name): "
    log.error "    key_name = '${key_name}"
    log.error "    file_name = '${field_name}"
    exit "${ERR_BITWARDEN_WRONG_GET_PARAMS}"
  fi

  local RET_VAL=
  RET_VAL=$(bitwarden.get "${key_name}"  | jq -r '.id' | xargs bw get attachment "${file_name}" --raw --itemid ) || die
  if [ x"${RET_VAL}" = 'x' ] ; then
    log.error "File '${file_name} not found"
    log.error "    key_name = '${key_name}'"
    log.error "    file_name = '${file_name}'"
    exit "${ERR_BITWARDEN_UNKNOWN_FIELD_VALUE}"
  fi
  echo -n "${RET_VAL}"
}
