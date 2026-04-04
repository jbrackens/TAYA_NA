#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

function emit_signal {
  if [[ -z $IDFX_PROC_ID ]]; then
    touch "$SIGNALS_DIR/$1"
  else
    touch "$SIGNALS_DIR/$IDFX_PROC_ID.$1"
  fi
}

function emit_signal_foreach {
  local signal=$1
  local procs=("${@:2}")
  for proc in "${procs[@]}"; do
    IDFX_PROC_ID=$proc emit_signal "$signal"
  done
}

function emit_signals {
  local proc=$IDFX_PROC_ID
  local signals=()
  local pubs=()
  while [ $# -gt 0 ]; do
    local b
    case $1 in
    +C*)
      b=$(brand_codes "${1#+C}")
      signals=("no-client")
      pubs=("brand-client.${b:-*}")
      ;;
    +W*)
      b=$(brand_codes "${1#+W}")
      signals=("no-worker")
      pubs=("brand-worker.${b:-*}")
      ;;
    +I*)
      module="${1#+I}"
      signals=("$module")
      pubs=("interceptor")
      ;;
    +DBGC*)
      b=$(brand_codes "${1#+DBGC}")
      signals=("debug-client")
      pubs=("brand-client.${b:-*}")
      ;;
    --nx-debug)
      signals=("debug-client")
      pubs=("brand-client.*")
      ;;
    --skip-scaffold)
      signals=("skip-scaffold")
      pubs=("post")
      ;;
    esac
    for pub in "${pubs[@]}"; do
      if [[ $proc =~ $pub ]]; then
        for signal in "${signals[@]}"; do
          emit_signal "$signal"
        done
      fi
    done
    shift
  done
}

function read_signal_group {
  local ret=()
  mapfile -t signals < <(find -L "$SIGNALS_DIR" -type f -name "$1" -exec basename {} \;)
  for signal in "${signals[@]}"; do
    ret+=("${signal##*.}")
  done
  echo "${ret[*]}"
}

function peek_signal {
  if [[ -z $IDFX_PROC_ID ]]; then
    [[ -f "$SIGNALS_DIR/$1" ]]
  else
    if [[ "$1" = "$IDFX_PROC_ID."* ]]; then
      [[ -f "$SIGNALS_DIR/$1" ]]
    else
      [[ -f "$SIGNALS_DIR/$IDFX_PROC_ID.$1" ]]
    fi
  fi
}

function peek_signals {
  for signal in "$@"; do
    if ! peek_signal "$signal"; then
      return 1
    fi
  done
  return 0
}

function consume_signal {
  if peek_signal "$1"; then
    if [[ -z $IDFX_PROC_ID ]]; then
      rm -f "$SIGNALS_DIR/$1"
    else
      if [[ "$1" = "$IDFX_PROC_ID."* ]]; then
        rm -f "$SIGNALS_DIR/$1"
      else
        rm -f "$SIGNALS_DIR/$IDFX_PROC_ID.$1"
      fi
    fi
    return 0
  else
    return 1
  fi
}

function consume_signals {
  local ret=()
  for signal in "$@"; do
    rets+=("$(consume_signal "$signal")")
  done
  for ret in "${rets[@]}"; do
    if [[ $ret == 1 ]]; then
      return 1
    fi
  done
  return 0
}

function wait_for_signal {
  local signal=$1
  if [[ $signal == *\** ]]; then
    # Convert signal to array of matching file names
    # shellcheck disable=SC2206
    signals=($SIGNALS_DIR/$signal)
    for file in "${signals[@]}"; do
      # Remove directory path from each file
      # shellcheck disable=SC2295
      file=${file#$SIGNALS_DIR/}
      # shellcheck disable=SC2048 disable=SC2086
      wait-on -l "file:$SIGNALS_DIR/$file" ${*:2}
    done
  else
    # shellcheck disable=SC2048 disable=SC2086
    wait-on -l "file:$SIGNALS_DIR/$signal" ${*:2}
  fi
}

function wait_for_signal_consumption {
  wait_for_signal "$@" && consume_signal "$1"
}
