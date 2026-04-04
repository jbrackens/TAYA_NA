#!/usr/bin/env bash
if [ ${0##*/} == ${BASH_SOURCE[0]##*/} ]; then
    echo "WARNING"
    echo "This script is not meant to be executed directly!"
    echo "Use this script only by sourcing it."
    echo
    exit 1
fi


COLOR_NC="\033[0m" # No Color
COLOR_STRONG="\033[1;96m"
COLOR_NORMAL="\033[0;36m"
function _log(){
    local ERROR="\033[1;91m"
    local INFO="\033[1;92m"
    local WARN="\033[1;93m"
    local S_WHITE="\033[1;96m"

    case $1 in
      INFO)
        local SPACER=" "
        ;;
      WARN)
        local SPACER=" "
        ;;
      *)
        local SPACER=""
        ;;
    esac

    case $1 in
      INFO)
        echo -e "${S_WHITE}[ ${!1}${1}${S_WHITE} ]${SPACER}  ${COLOR_NORMAL}${2}${COLOR_NC}" >&1
        ;;
      *)
        echo -e "${S_WHITE}[ ${!1}${1}${S_WHITE} ]${SPACER}  ${COLOR_NORMAL}${2}${COLOR_NC}" >&2
        ;;
    esac
}

function log.info() {
  if [ ${#} -gt 0 ] ; then
    _log INFO "${*}"
  else
    _log INFO ""
  fi
}

function log.error() {
  if [ ${#} -gt 0 ] ; then
    _log ERROR "${*}"
  else
    _log ERROR ""
  fi
}

function log.warning() {
  if [ ${#} -gt 0 ] ; then
    _log WARN "${*}"
  else
    _log WARN ""
  fi
}
