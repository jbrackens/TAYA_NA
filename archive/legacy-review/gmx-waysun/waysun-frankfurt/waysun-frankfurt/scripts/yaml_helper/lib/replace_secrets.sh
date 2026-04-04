#!/usr/bin/env bash
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

function replace_secrets.usage(){
  log.info "  ${0} replace_secrets [--raw] <secret_definitions_file_name> <source_template_file_name> <target_file_name>"
  log.info " "
  log.info "      --raw"
  log.info "         Optional flag to skip base64 encoding"
  log.info "      secret_definitions_file_name: "
  log.info "         File name of the secret definitions. Variable must start with prefix 'CFG_', example contents:"
  log.info "            CFG_MASTER_USERNAME='raw|my_secret_user'"
  log.info "            CFG_MASTER_PASSWORD='bitwarden|some_bitwarden_key|MASTER_PASSWORD'"
  log.info "            CFG_LICENSE='bitwarden_file|some_bitwarden_key|license.json'"
  log.info " "
  log.info "      source_template_file_name: "
  log.info "         Name of the template file to envsubs parameters, example contents: "
  log.info "            login:"
  log.info "              username: \"\${CFG_MASTER_USERNAME}\""
  log.info "              password: \"\${CFG_MASTER_PASSWORD}\""
  log.info " "
  log.info "      target_file_name:"
  log.info "         Name for output"
}

function replace_secrets.validate() {
  if [[ "${2}" == "--raw" ]] ; then
    shift
  fi

  if [[ "${#}" -ne 4 ]] ; then
    log.error "Wrong number of parameters $(( ${#} - 1 )) instead of 3"
    log.error " "
    exit "${ERR_EXECUTION_WRONG_PARAMETERS}"
  fi
  SECRET_DEFINITIONS_FILE_NAME="${2}"
  SOURCE_TEMPLATE_FILE_NAME="${3}"
  TARGET_FILE_NAME="${4}"
  if [[ ! -f "${SECRET_DEFINITIONS_FILE_NAME}" || ! -f "${SOURCE_TEMPLATE_FILE_NAME}" ]] ; then
    log.error "Wrong parameters - file are missing? "
    log.error "  secret_definitions_file_name = '${SECRET_DEFINITIONS_FILE_NAME}"
    log.error "  source_template_file_name = '${SOURCE_TEMPLATE_FILE_NAME}"
    log.error " "
    exit "${ERR_EXECUTION_WRONG_PARAMETERS}"
  fi
}


function replace_secrets(){
  local USE_RAW=FALSE
  if [[ "${1}" == "--raw" ]] ; then
    USE_RAW=TRUE
    shift
  fi
  bitwarden.login
  SECRET_DEFINITIONS_FILE_NAME="${1}"
  SOURCE_TEMPLATE_FILE_NAME="${2}"
  TARGET_FILE_NAME="${3}"

  while IFS= read -r line
  do
    IFS='=' read -r VARIABLE SECRET_DEFINITION <<< "${line}"
    if [[ "${USE_RAW}" == "TRUE" ]] ; then
      printf -v "${VARIABLE}" '%s' "$(common.get_secret "${SECRET_DEFINITION}")"
    else
     printf -v "${VARIABLE}" '%s' "$(common.get_and_encode_secret "${SECRET_DEFINITION}")"
    fi
    log.info "  ${VARIABLE} loaded"
  done < "${SECRET_DEFINITIONS_FILE_NAME}"

  k8s.compile_to_file "${SOURCE_TEMPLATE_FILE_NAME}" "${TARGET_FILE_NAME}"
}

