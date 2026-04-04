#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./fns.sh
source "$INTRCPTR_DIR/fns.sh"

case $1 in
puts)
  puts_kv "${@:2}"
  ;;
put)
  put_kv "$2"
  ;;
get)
  get_kv "$2"
  ;;
del)
  del_kv "$2"
  ;;
list)
  list_kv
  ;;
tl)
  shift
  to_let "$@"
  ;;
sg)
  shift
  get_service_group "$@"
  ;;
init)
  shift
  init_interceptor "$@"
  ;;
refresh)
  shift
  echo "$@"
  if arr_contains "-F" "$@"; then
    echo "Doing full refresh.."
    full_refresh_interceptor_stats
  fi
  if arr_contains "tnnls" "$@"; then
    echo "Updating tunnel details..."
    update_tunnel_deets
  fi
  if arr_contains "kv" "$@"; then
    echo "Updating kv status file..."
    update_kv_status_file
  fi
  if arr_contains "reqs" "$@"; then
    echo "Updating ngrok request history..."
    update_ngrok_req_history "false"
  fi
  if arr_contains "areqs" "$@" 2>/dev/null; then
    echo "Updating ngrok ALL request history..."
    update_ngrok_req_history "true"
  fi
  refresh_interceptor_stats
  ;;
hydrate)
  do_initial_hydration
  ;;
monitor)
  shift
  launch_interceptor_monitor "$@"
  ;;
relinquish)
  relinquish_held_leases
  ;;
esac
