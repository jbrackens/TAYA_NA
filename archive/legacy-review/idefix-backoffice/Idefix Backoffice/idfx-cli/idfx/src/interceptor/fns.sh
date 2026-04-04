#!/usr/bin/env bash
# shellcheck disable=SC2317
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./renderer.sh
source "$INTRCPTR_DIR/renderer.sh"
# shellcheck source=../launcher/signals.sh
source "$LAUNCHER_DIR/signals.sh"

# shellcheck disable=SC2016
declare -A ngrok_urls=(
	["payment"]="$(curl -s "$NGROK_API_URL/tunnels" |
		gojq -L"$JQ_DIR" --arg p "$PAYMENTSERVER_IDFX_PORT" -r 'include "tools"; find_ngrok_url($p)' |
		tr -d '\n')"
	["wallet"]="$(curl -s "$NGROK_API_URL/tunnels" |
		gojq -L"$JQ_DIR" --arg p "$WALLETSERVER_IDFX_PORT" -r 'include "tools"; find_ngrok_url($p)' |
		tr -d '\n')"
)

put_kv() {
	local module="$1"
	local ngrok_group="$(get_service_group "$module")"
	local value="$(
		cat <<-EOM
			{ "tenant": "${ngrok_urls[$ngrok_group]}" }
		EOM
	)"
	curl -X PUT "$KV_API_URL/values/$module" \
		-H "X-Auth-Email:$KV_AUTH_EMAIL" \
		-H "X-Auth-Key:$KV_AUTH_KEY" \
		-H "Content-Type: multipart/form-data" \
		-F "value=$value" \
		-F "metadata={}" | gojq
}

puts_kv() {
	local payload="[]"
	local expiration=$(($(date +%s) + 14400)) # 4 hours
	for module in "$@"; do
		local ngrok_group="$(get_service_group "$module")"
		if [[ -z "$ngrok_group" || "$ngrok_group" == "??" ]]; then
			echo "No ngrok url found for module: $module"
			continue
		fi
		local json_object=$(
			cat <<-EOM
				{
					"key": "$module",
					"expiration": $expiration,
					"metadata": {
						"group": "$ngrok_group",
						"tenant": "${ngrok_urls[$ngrok_group]}",
						"lease_start": "$(date +%s)",
						"owner": "$USER",
						"expiration": $expiration
					},
					"value": {
						"tenant": "${ngrok_urls[$ngrok_group]}",
						"lease_start": "$(date +%s)",
						"expiration": $expiration
					}
				}
			EOM
		)
		#shellcheck disable=SC2016
		payload="$(echo "$payload" | gojq -c -r --argjson obj "$json_object" '. += [($obj+{ "value": ($obj.value|tojson)})]')"
	done
	local resp success
	resp="$(curl -s -X PUT "$KV_API_URL/bulk" \
		-H "X-Auth-Email:$KV_AUTH_EMAIL" \
		-H "X-Auth-Key:$KV_AUTH_KEY" \
		-H "Content-Type: application/json" \
		--data "$payload")"
	success="$(gojq -r '.success' <<<"$resp")"
	if [[ "$success" == "true" ]]; then
		colorize ":g:CF Interceptor Initialized Successfully!"
		return 0
	else
		colorize ":r:Failed to update kv values: "
		mapfile -t errors <<<"$(gojq -r '.errors[]' <<<"$resp")"
		for error in "${errors[@]}"; do
			echo "$error"
		done
		return 1
	fi
}

get_kv() {
	curl -s -X GET "$KV_API_URL/values/$1" \
		-H "X-Auth-Email:$KV_AUTH_EMAIL" \
		-H "X-Auth-Key:$KV_AUTH_KEY" \
		-H "Content-Type: application/json" | gojq
}

del_kv() {
	curl -s -X DELETE "$KV_API_URL/values/$1" \
		-H "X-Auth-Email:$KV_AUTH_EMAIL" \
		-H "X-Auth-Key:$KV_AUTH_KEY" \
		-H "Content-Type: application/json" | gojq
}

list_kv() {
	curl -s -X GET "$KV_API_URL/keys" \
		-H "X-Auth-Email:$KV_AUTH_EMAIL" \
		-H "X-Auth-Key:$KV_AUTH_KEY" \
		-H "Content-Type: application/json" | gojq
}

to_let() {
	declare -A indexes
	indexes["payment"]="$BACKEND_DIR/packages/gstech-paymentserver/server/index.js"
	indexes["wallet"]="$BACKEND_DIR/packages/gstech-walletserver/server/index.js"
	local wanted_indices=("$@")
	# shellcheck disable=SC2034
	local avail_indices=("${!indexes[@]}")
	local ret_indices=()
	if [[ ${#wanted_indices[@]} -eq 0 ]]; then
		ret_indices=("${!indexes[@]}")
	else
		IFS=' ' read -ra valid_indices <<<"$(intersect_arrays wanted_indices[@] avail_indices[@])"
		ret_indices=("${valid_indices[@]}")
	fi
	local candidates=()
	for index in "${ret_indices[@]}"; do
		mapfile -t routes < <(awk -F'/|,' '!/^\/\// && /\/api\/v1\/[^\/]+, routers/ {print $4}' "${indexes[$index]}" | tr -d "'" | tr -d '"')
		candidates+=("${routes[@]}")
	done
	for c in "${candidates[@]}"; do echo "$c"; done
}

get_service_group() {
	local service="$1"
	mapfile -t payment_servs < <(to_let "payment")
	if arr_contains "$service" "${payment_servs[@]}"; then
		echo "payment" && return
	fi
	mapfile -t wallet_servs < <(to_let "wallet")
	if arr_contains "$service" "${wallet_servs[@]}"; then
		echo "wallet" && return
	fi
	echo "??" && return 1
}

init_interceptor() {
	# colorize "Obtaining CF leases: :b:$*"
	local modules_arr=("$@")
	local pay_mods=()
	local wal_mods=()
	local unk_mods=()
	declare -A grpd_mods_json=(
		["payment"]="[]"
		["wallet"]="[]"
		["unknown"]="[]"
	)
	for module in "${modules_arr[@]}"; do
		local service_group
		service_group="$(get_service_group "$module" || true)"
		if [[ "$service_group" = "payment" ]]; then
			pay_mods+=("$module")
		elif [[ "$service_group" = "wallet" ]]; then
			wal_mods+=("$module")
		else
			unk_mods+=("$module")
		fi
	done
	if [[ "${#pay_mods[@]}" -gt 0 ]]; then
		grpd_mods_json["payment"]=$(printf '%s\n' "${pay_mods[@]}" | gojq -R . | gojq -s .)
	fi
	if [[ "${#wal_mods[@]}" -gt 0 ]]; then
		grpd_mods_json["wallet"]=$(printf '%s\n' "${wal_mods[@]}" | gojq -R . | gojq -s .)
	fi
	if [[ "${#unk_mods[@]}" -gt 0 ]]; then
		grpd_mods_json["unknown"]=$(printf '%s\n' "${unk_mods[@]}" | gojq -R . | gojq -s .)
	fi
	# shellcheck disable=SC2016
	gojq -n \
		--argjson pay "${grpd_mods_json["payment"]}" \
		--argjson wal "${grpd_mods_json["wallet"]}" \
		--argjson unk "${grpd_mods_json["unknown"]}" \
		'{"index":{payment: $pay, wallet: $wal, unknown: $unk}}' >"$INTRCPTR_STAT_FILE"
}

update_tunnel_deets() {
	curl -sS -X GET "$NGROK_API_URL/tunnels" |
		gojq -L"$JQ_DIR" 'include "tools"; parse_tunnels' >"$INTRCPTR_TNLS_FILE"
}

update_ngrok_req_history() {
	local do_all="${1:-false}"
	local existing="$INTRCPTR_REQS_FILE"
	local existing_tmp="$TMP_DIR/reqs_.json"
	local incoming="$TMP_DIR/_reqs.json"
	if ! exists_with_content "$existing" 2>/dev/null; then echo '[]' >"$existing"; fi
	cp "$existing" "$existing_tmp"
	curl -s -X GET "$NGROK_API_URL/requests/http" >"$incoming" || true
	if ! exists_with_content "$incoming" 2>/dev/null; then echo '[]' >"$incoming"; fi
	# shellcheck disable=SC2016
	gojq -L"$JQ_DIR" -s --arg da "$do_all" \
		'include "tools"; update_req_history($da)' \
		"$existing_tmp" "$incoming" >"$existing"
	rm "$existing_tmp" "$incoming" || true
}

update_kv_status_file() {
	local existing="$INTRCPTR_CFKV_FILE"
	if ! exists_with_content "$existing" 2>/dev/null; then
		list_kv | gojq -r '{ts: (now|round), status: .result}' >"$existing"
		return
	fi
	local existing_tmp="$TMP_DIR/cfkv_.json"
	local incoming="$TMP_DIR/_cfkv.json"
	cp "$existing" "$existing_tmp"
	list_kv | gojq -r '{ts: (now|round), status: .result}' >"$incoming"
	gojq -L"$JQ_DIR" -s 'include "tools"; update_kv_status' \
		"$existing_tmp" "$incoming" >"$existing"
	rm -f "$existing_tmp" "$incoming" || true
}

refresh_interceptor_stats() {
	local outgoing="$TMP_DIR/_interceptor.json"
	cp "$INTRCPTR_STAT_FILE" "$outgoing"
	gojq -L"$JQ_DIR" -s --arg pp "$PAYMENTSERVER_IDFX_PORT" --arg wp "$WALLETSERVER_IDFX_PORT" \
		'include "tools"; compile_interceptor_stats' \
		"$outgoing" "$INTRCPTR_REQS_FILE" "$INTRCPTR_CFKV_FILE" "$INTRCPTR_TNLS_FILE" \
		>"$INTRCPTR_STAT_FILE"
	rm -f "$outgoing" || true
	echo -n "$(gojq -r '.tsfmt' "$INTRCPTR_STAT_FILE")"
}

# shellcheck disable=SC2120
full_refresh_interceptor_stats() {
	local no_kv=0
	for a in "$@"; do
		case "$a" in
		--no-kv=*)
			no_kv="${a#*=}"
			;;
		esac
	done
	# TODO: error handling should halt interceptor if ngrok is not running
	if update_tunnel_deets 2>/dev/null; then
		update_ngrok_req_history "false"
		if [[ "$no_kv" -eq 0 ]]; then update_kv_status_file; fi
		refresh_interceptor_stats
	else
		echo ""
	fi
}

do_initial_hydration() {
	emit_signal "hydrating"
	last_refresh_ts="$(full_refresh_interceptor_stats)"
	consume_signal "hydrating"
	emit_signal "hydrated"
	echo "$last_refresh_ts"
}

relinquish_held_leases() {
	if ! exists_with_content "$INTRCPTR_CFKV_FILE"; then return; fi
	mapfile -t held <<<"$(gojq -L"$JQ_DIR" -r -s \
		'include "tools"; get_held_leases' \
		"$INTRCPTR_CFKV_FILE" "$INTRCPTR_TNLS_FILE")"
	for h in "${held[@]}"; do
		del_kv "$h" >/dev/null 2>&1
	done
}

render_countdown_bar() {
	tput cup 0 0
	local cols=$(tput cols) prc="$1" tot="$2" ts="$3" msg="$4"
	local info="$ts"
	if ((prc % tot == 0)); then info="$msg"; fi
	local barc=$((cols - (20 + 1)))
	local percent="$(printf "%.2f" "$(bc -l <<<"$prc / $tot")")"
	local progress="$(printf "%.0f" "$(bc -l <<<"$percent * $barc")")"
	for ((j = 1; j <= barc; j++)); do
		if ((j <= (barc - progress))); then
			printf "▓"
		else
			printf "░"
		fi
	done
	local info_len="${#info}"
	local info_pad=$((20 - info_len))
	printf "%20s%${info_pad}s\n" "$info" " "
}

render_monitor_table() {
	local rndr_level="$1" vcols="$2" vrows="$3" \
		rndr_rows="$4" rndr_cols="$5" debug_render="$6"
	local output="$(render_interceptor_stats)"
	if [[ "$rndr_level" -eq 2 ]]; then
		tput cup 0 0
	else
		tput cup 0 1
	fi
	printf "\033[J" # clear screen from cursor to end
	if ! peek_signal "stop" && ! peek_signal "stopped"; then
		printf "\n\n%s" "$output"
		if [[ -n "$debug_render" ]]; then
			local debug_msg="($vcols x $vrows) [ $rndr_cols x $rndr_rows ] /${refresh_interval}s"
			local debug_msg_len="${#debug_msg}"
			printf "\n\n\e[0;90m%-$((rndr_cols - debug_msg_len))s%s\e[m" " " "$debug_msg"
		fi
		echo -e "$(greyscale "$output")" >"$INTRCPTR_LAST_STATE"
	else
		printf "\n\n%s" "$(cat "$INTRCPTR_LAST_STATE")"
	fi
}

launch_interceptor_monitor() {
	emit_signal "running"
	local refresh_interval="${1:-30}" last_refresh_ts="" \
		first_render=1 debug_render=""
	for a in "$@"; do
		case "$a" in
		--debug)
			debug_render="true"
			;;
		-i=* | --interval=*)
			refresh_interval="${a#*=}"
			;;
		-ts=* | --timestamp=*)
			last_refresh_ts="${a#*=}"
			;;
		esac
	done
	if exists_with_content "$INTRCPTR_LAST_STATE"; then rm -f "$INTRCPTR_LAST_STATE"; fi

	local i=1 vcols=$(tput cols) vrows=$(tput lines) output="" kv_cnt=1
	local rndr_rows="$(compute_row_render_level "$vrows")"
	local rndr_cols="$(compute_col_render_level)"

	on_stop() {
		emit_signal "stopped"
		tput cnorm
	}
	trap on_stop SIGTERM SIGINT EXIT

	tput clear
	tput civis
	render_countdown_bar "0" "$refresh_interval" "$last_refresh_ts" "Fetching data..."
	while ! consume_signal "stop" && ! peek_signal "stopped"; do
		local rerender=0 active_lease_count=0 no_kv=1
		if [[ "$first_render" -eq 1 ]]; then
			rerender=2
			first_render=0
		fi
		tput cup 0 1
		if ((i % refresh_interval == 0)); then
			if ((kv_cnt % 5 == 0)); then kv_cnt=0; fi
			active_lease_count="$(gojq -L"$JQ_DIR" -r 'include "tools"; active_lease_count' "$INTRCPTR_STAT_FILE")"
			if [[ "$active_lease_count" -gt 0 && "$kv_cnt" -eq 0 ]]; then no_kv=0; fi
			last_refresh_ts="$(full_refresh_interceptor_stats --no-kv="$no_kv")"
			if [[ -z "$last_refresh_ts" ]]; then
				tput cup 0 0
				tput clear
				printf "NGROK ERR - Check ngrok then restart interceptor"
				return 1
			fi
			rerender=1
			i=0
			kv_cnt=$((kv_cnt + 1))
		elif ((vcols != $(tput cols))) || [[ "$(compute_row_render_level "$(tput lines)")" != "$rndr_rows" ]]; then
			tput cup 0 0
			tput el
			printf "Viewport changed, re-rendering..."
			rerender=2
		fi
		vrows=$(tput lines) vcols=$(tput cols)
		rndr_rows="$(compute_row_render_level "$vrows")" rndr_cols="$(compute_col_render_level)"
		if [[ "$rerender" -gt 0 ]]; then
			render_monitor_table "$rerender" "$vcols" "$vrows" \
				"$rndr_rows" "$rndr_cols" "$debug_render"
		fi
		i=$((i + 1))
		if ! peek_signal "stop" && ! peek_signal "stopped"; then
			render_countdown_bar "$i" "$refresh_interval" "$last_refresh_ts" "Refreshing data..."
		fi
		sleep 1
	done
}
