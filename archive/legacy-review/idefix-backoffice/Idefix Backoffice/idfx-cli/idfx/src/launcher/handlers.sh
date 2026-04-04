#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./task-fns.sh
source "$LAUNCHER_DIR/task-fns.sh"

function handle_env_cmd {
	local do_bootstrap do_seq do_migrate opts args
	# shellcheck disable=SC2034
	local rcvd_args=("$@")
	# shellcheck disable=SC2034
	local avail_opts=("-s" "-b" "-p" "-m")
	IFS=' ' read -ra opts <<<"$(intersect_arrays avail_opts[@] rcvd_args[@])"
	IFS=' ' read -ra args <<<"$(diff_arrays rcvd_args[@] avail_opts[@])"
	for opt in "${opts[@]}"; do
		case $opt in
		-s)
			do_seq="true"
			;;
		-b)
			do_bootstrap="true"
			;;
		-m)
			do_migrate="true"
			args=("-w" "${args[@]}")
			;;
		esac
	done
	if [[ -n "$do_seq" ]]; then
		env_gstech -s "${args[@]}"
	else
		start_time=$(date +%s)
		$IDFX_SPINNER "(Re-)Starting gstech environment services" <<-EOM
			$PROGRESS_FNS env $(quote_arr "${args[@]}")
		EOM
		end_time=$(date +%s)
		echo "environment reset in $(print_duration "$start_time" "$end_time")"
	fi
	if [[ -n "$do_bootstrap" ]]; then bootstrap_gstech; fi
	# shellcheck disable=SC2119
	if [[ -n "$do_migrate" ]]; then migrate_gstech; fi
}

function handle_open_cmd {
	if [[ -z "$1" ]]; then
		local open_targets
		declare -A serv_map
		local jid="$(date +%s)"
		$IDFX_SPINNER -q -j="$jid" "Querying available resources" <<-EOM
			$PROGRESS_FNS check-ports
		EOM
		local result="$(spin_job_output -d "$jid")"
		IFS=' ' read -ra listen_ports <<<"$result"
		for port in "${listen_ports[@]}"; do
			serv_map["${port%%:*}"]="${port##*:}"
		done
		open_targets="$(echo "${!serv_map[@]}" | tr ' ' '\n' | gum filter --no-limit --header="select services to open" --header.foreground="212")"
		for open_target in $open_targets; do
			open "http://localhost:${serv_map[$open_target]}"
		done
	fi

	while [ $# -gt 0 ]; do
		case $1 in
		proxy | ngrok)
			open "http://localhost:$NGROK_IDFX_APP_PORT"
			;;
		inbox | smtp | mail | mailpit | email)
			open "http://localhost:$MAILPIT_IDFX_APP_PORT"
			;;
		idefix | backoffice)
			open "http://localhost:$BO_IDFX_APP_PORT"
			;;
		campa)
			open "http://localhost:$CAMPA_IDFX_APP_PORT"
			;;
		ld | luckydino)
			open "http://localhost:$LD_IDFX_APP_PORT"
			;;
		cj | jefe | casinojefe)
			open "http://localhost:$CJ_IDFX_APP_PORT"
			;;
		jw | kk | justwow | kalevala)
			open "http://localhost:$KK_IDFX_APP_PORT"
			;;
		os | olaspill)
			open "http://localhost:$OS_IDFX_APP_PORT"
			;;
		hs | fk | hipspin | fiksu)
			open "http://localhost:$FK_IDFX_APP_PORT"
			;;
		sn | fs | sportnation | freshspins)
			open "http://localhost:$SN_IDFX_APP_PORT"
			;;
		vb | vie | viebet)
			open "http://localhost:$VB_IDFX_APP_PORT"
			;;
		esac
		shift
	done
}
