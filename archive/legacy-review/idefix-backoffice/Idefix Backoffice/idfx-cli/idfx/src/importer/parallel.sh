#!/usr/bin/env bash
# shellcheck disable=SC2086
set -e

echo "$$" >>"$PIDS_FILE"

export FILTER
#region Multi-Threaded Argset Specs
export GSP1="__migrations__ affiliates persons brands:countries+languages+currencies"
export GSP2="players bonuses \
segments game_profiles promotions users conversion_rate_histories \
questionnaires:questionnaire_questions risk_types:risks \
game_manufacturers:games:brand_game_profiles+promotion_games \
payment_methods:payment_providers:payment_provider_countries+payment_provider_currencies+payment_provider_limits"
export GSP3LITE="player_questionnaires:player_questionnaire_answers \
player_frauds:player_events player_bonuses accounts:kyc_requests:kyc_documents \
player_limits player_segments account_statements"
export GSP3FULL="$GSP3LITE transactions payments:player_counters:sessions:manufacturer_sessions:game_rounds \
report_daily_player_game_summary report_daily_games_brands report_daily_brands report_hourly_players"
export GSP3=$GSP3FULL

export CSP1="__migrations__ countries subscription_options:players:deposits campaign_groups:campaigns content_type:content"
export CSP2="campaigns_deposits campaigns_players:audience_rules campaigns_content:events reward_rules:credited_rewards"

export RSP1="__migrations__ thumbnails:games reward_definitions:progresses"
export RSP2="game_progresses rewards"
export RSP3="progresses_rewards ledgers:ledgers_events+progresses_ledgers"
#endregion

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
source "./argsets.sh"
source "./pg-fns.sh"
source "./resolvers.sh"
source "./common.sh"

FILTER="$(get_filt_qry)"

function track_pid {
	local pid
	pid=$1
	echo "$pid" >>"$PIDS_FILE"
}

function parallel_spec_to_tables {
	echo "${*}" | sed 's/[\:\+]/ /g' | sed 's/  */ /g'
}

function process_items {
	local db_url
	local db
	db_url=$1
	db="${db_url##*/}"
	for item in "${@:2}"; do
		if [[ $item == *:* ]]; then
			local split_items
			IFS=':' read -ra split_items <<<"$item"
			for sub_item in "${split_items[@]}"; do
				if [[ $sub_item == *'+'* ]]; then
					local sitem
					IFS='+' read -ra sitem <<<"$sub_item"
					process_items "$db_url" "${sitem[@]}"
				else
					run_importer "$db_url" "$FILTER" "$sub_item"
				fi
			done &
			track_pid "$!"
			# wait
		else
			run_importer "$db_url" "$FILTER" "$item" &
			track_pid "$!"
			# wait
		fi
	done
	wait
}

function validate_cache {
	local dbs=("gs" "rs" "cs")
	local db_url
	local tables
	local specs
	for db in "${dbs[@]}"; do
		case $db in
		"gs")
			db_url=$(get_conn_url "gs")
			specs=("$GSP1" "$GSP2" "$GSP3")
			;;
		"rs")
			db_url=$(get_conn_url "rs")
			specs=("$RSP1" "$RSP2" "$RSP3")
			;;
		"cs")
			db_url=$(get_conn_url "cs")
			specs=("$CSP1" "$CSP2")
			;;
		esac
		read -ra tables < <(dedupe_array "$(parallel_spec_to_tables "${specs[@]}")")
		verify_cache "$db_url" "${tables[@]}"
	done
	return 0
}

function par_prep {
	local tables
	read -ra tables < <(dedupe_array "$(parallel_spec_to_tables "${@:2}")")
	[[ -n $flag_cache ]] && verify_cache "$1" "${tables[@]}"
	do_prep "$1" "${tables[@]}"
}

function wipe_existing {
	local gs_url cs_url rs_url db_args
	if [[ "${#@}" -eq 0 ]]; then
		db_args=("gs" "cs" "rs")
	else
		db_args=("$@")
	fi
	for db in "${db_args[@]}"; do
		local db_url="$(get_conn_url "$db")"
		local specs=()
		case $db in
		"gs")
			specs=("$GSP1" "$GSP2" "$GSP3")
			;;
		"cs")
			specs=("$CSP1" "$CSP2")
			;;
		"rs")
			specs=("$RSP1" "$RSP2" "$RSP3")
			;;
		esac
		par_prep "$db_url" "${specs[@]}"
	done
}

main() {
	local gs_url cs_url rs_url db_args
	gs_url=$(get_conn_url "gs")
	cs_url=$(get_conn_url "cs")
	rs_url=$(get_conn_url "rs")
	if [[ "${#@}" -eq 0 ]]; then
		db_args=("gs" "cs" "rs")
	else
		db_args=("$@")
	fi
	log1 "db_args: ${db_args[*]}"
	if arr_contains "gs" "${db_args[@]}"; then
		process_items "$gs_url" $GSP1
		process_items "$gs_url" $GSP2
		process_items "$gs_url" $GSP3 &
		(
			track_pid "$!"
			flock 200
			(
				if arr_contains "cs" "${db_args[@]}"; then
					track_pid "$!"
					process_items "$cs_url" $CSP1
					process_items "$cs_url" $CSP2
				fi
			) &
			(
				if arr_contains "rs" "${db_args[@]}"; then
					track_pid "$!"
					process_items "$rs_url" $RSP1
					process_items "$rs_url" $RSP2
					process_items "$rs_url" $RSP3
				fi
			)
			wait
		) 200>"$TMP_DIR/gstech-players.lock"
		wait
	else
		(
			if arr_contains "cs" "${db_args[@]}"; then
				track_pid "$!"
				process_items "$cs_url" $CSP1
				process_items "$cs_url" $CSP2
			fi
		) &
		(
			if arr_contains "rs" "${db_args[@]}"; then
				track_pid "$!"
				process_items "$rs_url" $RSP1
				process_items "$rs_url" $RSP2
				process_items "$rs_url" $RSP3
			fi
		)
		wait
	fi
}

if [[ "$1" == "pre-import" ]]; then
	clean_prev_runs
	"$LAUNCHER_DIR/main.sh" migrate
	shift
	wipe_existing "$@"
elif [[ "$1" == "validate-cache" ]]; then
	validate_cache
else
	main "$@"
fi
