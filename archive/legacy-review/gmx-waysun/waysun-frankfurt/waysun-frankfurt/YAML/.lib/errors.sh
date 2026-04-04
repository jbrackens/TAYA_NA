#!/usr/bin/env bash
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi

readonly ERR_CATCH_SIGNAL=250

readonly ERR_WRONG_CFG_PARAMS_CONFIGURATION=200

readonly ERR_TEMPLATE_FILE_NOT_FOUND=201
readonly ERR_UNKNOWN_NAMESPACE=202
readonly ERR_UNKNOWN_CONFIG_VARIABLE=203
readonly ERR_K8S_KUBECTL_ERROR=205

readonly ERR_BITWARDEN_CALL_ERROR=220
readonly ERR_BITWARDEN_WRONG_GET_PARAMS=221
readonly ERR_BITWARDEN_UNKNOWN_FIELD_VALUE=222

readonly ERR_COMMON_UNKNOWN_ENGINE=230


