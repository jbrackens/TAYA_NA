#!/usr/bin/env bash
set -e

export SKIP_PARSING=(
	"gstech.__migrations__"
	"campaignserver.__migrations__"
	"rewardserver.__migrations__"
	"gstech.brand_game_profiles"
	"gstech.brands"
	"campaignserver.campaigns_deposits"
	"campaignserver.campaigns_players"
	"gstech.conversion_rate_histories"
	"gstech.countries"
	"campaignserver.credited_rewards"
	"gstech.currencies"
	"campaignserver.deposits"
	"gstech.deposits"
	"campaignserver.events"
	"rewardserver.game_progresses"
	"gstech.game_profiles"
	"gstech.game_rounds"
	"gstech.languages"
	"rewardserver.ledgers"
	"rewardserver.ledgers_events"
	"gstech.manufacturer_sessions"
	"gstech.payment_provider_countries"
	"gstech.payment_provider_currencies"
	"gstech.payment_provider_limits"
	"gstech.persons"
	"gstech.player_bonuses"
	"gstech.player_segments"
	"gstech.promotion_games"
	"gstech.player_counters"
	"rewardserver.progresses"
	"rewardserver.progresses_ledgers"
	"rewardserver.progresses_rewards"
	"gstech.report_daily_brands"
	"gstech.report_daily_games_brands"
	"gstech.report_daily_player_game_summary"
	"gstech.report_hourly_players"
	"gstech.sessions"
	"rewardserver.thumbnails"
	"gstech.transactions"
)
export BIN_SAFE=(
	"gstech.__migrations__"
	"campaignserver.__migrations__"
	"rewardserver.__migrations__"
	"gstech.brand_game_profiles"
	"gstech.brands"
	"campaignserver.campaigns_deposits"
	"gstech.conversion_rate_histories"
	"gstech.countries"
	"campaignserver.credited_rewards"
	"gstech.currencies"
	"campaignserver.events"
	"rewardserver.game_progresses"
	"gstech.game_profiles"
	"gstech.game_rounds"
	"gstech.languages"
	"rewardserver.ledgers_events"
	"gstech.payment_provider_countries"
	"gstech.payment_provider_currencies"
	"gstech.payment_provider_limits"
	"gstech.persons"
	"gstech.player_bonuses"
	"gstech.player_segments"
	"gstech.promotion_games"
	"gstech.player_counters"
	"rewardserver.progresses_ledgers"
	"rewardserver.progresses_rewards"
	"gstech.report_daily_brands"
	"gstech.report_daily_player_game_summary"
	"gstech.report_hourly_players"
	"rewardserver.thumbnails"
	"gstech.transactions"
	"campaignserver.audience_rules"
	"campaignserver.content"
)

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

function latest_partitions {
	local -i num_parts="${3:-2}"
	if (($(date "+%-d") <= 7)); then
		num_parts+=1
	fi
	exec_sql "$1" <<-EOF
		WITH lp AS (
				SELECT
					tablename,
					TO_DATE(substring(tablename FROM '$2_p([0-9]+_[0-9]+)'), 'YYYY_MM') AS partition_date
				FROM pg_tables
				WHERE tablename LIKE '$2_p%'
				AND TO_DATE(substring(tablename FROM '$2_p([0-9]+_[0-9]+)'), 'YYYY_MM') <= CURRENT_DATE
				ORDER BY partition_date DESC
				LIMIT $num_parts
		)
		SELECT tablename FROM lp ORDER BY tablename ASC;
	EOF
}

function refresh_materialized_views {
	local db=$1
	local views=("${@:2}")
	local refresh_query=""
	for view in "${views[@]}"; do
		refresh_query+=$(printf "REFRESH MATERIALIZED VIEW \"%s\";\n" "$view")
	done
	exec_sql "postgresql://root:1234@127.0.0.1/$db" <<-EOF
		$refresh_query
	EOF
}

function get_any_sequences {
	local db=$1
	local tbl=$2
	exec_sql "postgresql://root:1234@127.0.0.1/$db" <<-EOF
		select json_agg(t.*) from (
			SELECT a.attname AS column_name, c.relname AS sequence_name
			FROM pg_class c
			JOIN pg_depend d ON d.objid = c.oid
			JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
			WHERE c.relkind = 'S'
				AND d.classid = 'pg_class'::regclass
				AND d.refclassid = 'pg_class'::regclass
				AND d.deptype = 'a'
				AND d.refobjid IN (
					SELECT oid
					FROM pg_class
					WHERE relname = '$tbl'
						AND relnamespace IN (
							SELECT oid
							FROM pg_namespace
							WHERE nspname = 'public'
						)
				)
			) t;
	EOF
}

function update_pg_sequences {
	local db=$1
	local tbl=$2
	local sqn_qry=""
	local sqns_json

	sqns_json=$(get_any_sequences "$db" "$tbl")
	if [[ -n "$sqns_json" ]]; then
		# shellcheck disable=SC2016
		IFS=',' read -ra sqns_arr <<<"$(gojq -n -r -c --argjson i "$sqns_json" '$i[] | [.sequence_name, .column_name] | @sh' | tr '\n' ',')"
		for sqn in "${sqns_arr[@]}"; do
			IFS=' ' read -ra sqn <<<"${sqn//\'/}"
			sqn_qry+=$(printf "SELECT setval('public.\"%s\"', (SELECT MAX(\"%s\") FROM public.\"%s\"));\n" "${sqn[0]}" "${sqn[1]}" "$tbl")
		done
		exec_sql "postgresql://root:1234@localhost/$db" <<-EOF 1>/dev/null
			$sqn_qry
		EOF
	fi
}

function update_payments_session_ids {
	local sessions_qry=""
	local sessions_arr
	# shellcheck disable=SC2016
	IFS=',' read -ra sessions_arr <<<"$(gojq <"$DATA_DIR/$(pick_from_cache "gstech" "payments" "1").json" -r 'map(select(.sessionId != null)) | .[] | [.id, .sessionId] | @sh' | tr '\n' ',')"
	for session in "${sessions_arr[@]}"; do
		IFS=' ' read -ra sessn <<<"${session//\'/}"
		sessions_qry+=$(printf "UPDATE \"payments\" SET \"sessionId\"=%s WHERE \"id\"=%s;\n" "${sessn[1]}" "${sessn[0]}")
	done
	exec_sql "postgresql://root:1234@localhost/gstech" <<-EOF
		$sessions_qry
	EOF
}

function update_player_stickynote_ids {
	local stickies_qry=""
	local stickies_arr
	# shellcheck disable=SC2016
	IFS=',' read -ra stickies_arr <<<"$(gojq <"$DATA_DIR/$(pick_from_cache "gstech" "players" "1").json" -r 'map(select(.stickyNoteId != null)) | .[] | [.id, .stickyNoteId] | @sh' | tr '\n' ',')"
	for sticky in "${stickies_arr[@]}"; do
		IFS=' ' read -ra stky <<<"${sticky//\'/}"
		stickies_qry+=$(printf "UPDATE \"players\" SET \"stickyNoteId\"=%s WHERE \"id\"=%s;\n" "${stky[1]}" "${stky[0]}")
	done
	exec_sql "postgresql://root:1234@localhost/gstech" <<-EOF
		$stickies_qry
	EOF
}

function insert_idefix_test_user {
	local local_user_email="${IDEFIX_USER:-"idfx.local@eeg.tech"}"
	exec_sql "postgresql://root:1234@127.0.0.1/gstech" <<-EOF
		INSERT INTO "public"."users"
			("hash", "email", "handle", "name", "mobilePhone", "accountClosed", "administratorAccess", "reportingAccess", "campaignAccess", "requirePasswordChange", "paymentAccess", "riskManager")
			VALUES
			('\$2a\$10\$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i', '$local_user_email', 'idfx', 'Local User', '1234567890', 'f', 't', 't', 't', 'f', 't', 't')
			ON CONFLICT (lower(("email")::text))
			DO UPDATE SET "hash" = EXCLUDED."hash";
	EOF
}

function download_query_data {
	local query
	local timing=
	local db_url=$1
	local fname=$2
	local tbl=$3
	local trans_tbls
	IFS=' ' read -ra trans_tbls <<<"$TRANSFORM_TABLES"

	query=$(cat | tr '\n' ' ')
	if [[ "$flag_verbose" -ge 3 ]]; then timing="\timing on"; fi
	if [ -n "$flag_binary" ] && arr_contains "$db.$tbl" "${BIN_SAFE[@]}" && ! arr_contains "$db.$tbl" "${trans_tbls[@]}"; then
		exec_sql "$db_url" -X -o "$DATA_DIR/$fname.bin" <<-EOF
			$timing
			BEGIN;
			SET LOCAL CLIENT_ENCODING TO UTF8;
			SET LOCAL STANDARD_CONFORMING_STRINGS TO ON;
			\copy ($query) TO stdout WITH BINARY
			COMMIT;
		EOF
	else
		exec_sql "$db_url" -o "$DATA_DIR/$fname.json" <<-EOF
			$timing
			select coalesce(json_agg(t.*), '[]') from ($query) t;
		EOF
	fi
}

function do_binary_import {
	local db=$1
	local tbl=$2
	local fname=$3
	local bin_file="$DATA_DIR/$fname.bin"
	exec_sql "postgresql://root:1234@127.0.0.1/$db" <<-EOF
		BEGIN;
		SET LOCAL session_replication_role = replica;
		SET CLIENT_ENCODING TO UTF8;
		SET STANDARD_CONFORMING_STRINGS TO ON;
		\copy "$tbl" FROM '$bin_file' WITH BINARY;
		COMMIT;
	EOF
}

function do_import_json {
	local db=$1
	local tbl=$2
	local fname=$3
	local tmp_tbl="tmp_$tbl"
	local parsed_file="$TMP_DIR/_parsed_$db$tbl.json"
	local trans_tbls
	IFS=' ' read -ra trans_tbls <<<"$TRANSFORM_TABLES"

	if arr_contains "$db.$tbl" "${SKIP_PARSING[@]}" && ! arr_contains "$db.$tbl" "${trans_tbls[@]}"; then
		sed '1s/^\[// ; $s/]\{1,\}$// ; s/,[[:blank:]]*$//' "$DATA_DIR/$fname.json" >"$parsed_file"
	else
		gojq -s -L"$JQ_DIR" -c --arg t "$db.$tbl" -f "$JQ_PARSER" "$DATA_DIR/$fname.json" "$TRANSFORMER_JSON" >"$parsed_file"
	fi
	if [ -s "$parsed_file" ] && ! [[ $(<"$parsed_file") == $'\n' || -z $(<"$parsed_file") ]]; then
		exec_sql "postgresql://root:1234@127.0.0.1/$db" <<-EOF
			BEGIN;
			SET LOCAL session_replication_role = replica;
			SET CLIENT_ENCODING TO UTF8;
			SET STANDARD_CONFORMING_STRINGS TO ON;
			CREATE UNLOGGED TABLE $tmp_tbl (c text);
			\COPY $tmp_tbl (c) FROM '$parsed_file';
			INSERT INTO "$tbl" SELECT q.* FROM $tmp_tbl, json_populate_record(NULL::"$tbl", c::json) AS q;
			DROP TABLE if exists $tmp_tbl;
			COMMIT;
		EOF
	fi
	[[ -z "$flag_skippostclean" ]] && rm -f "$parsed_file"
}

function do_import {
	local db=$1
	local tbl=$2
	local fname=$3
	local fext
	fext=$(get_file_extension "$fname")
	if [ "$fext" = "bin" ]; then
		do_binary_import "$db" "$tbl" "$fname"
	else
		do_import_json "$db" "$tbl" "$fname"
	fi
	do_post_import_chores "$db" "$tbl"
}

function do_post_import_chores {
	local db=$1
	local tbl=$2
	if [[ "$db" = "gstech" && "$tbl" = "conversion_rate_histories" ]]; then
		refresh_materialized_views "$db" "conversion_rates" "monthly_conversion_rates"
	fi
	if [[ "$db" = "gstech" && "$tbl" = "player_events" ]]; then
		update_player_stickynote_ids
	fi
	if [[ "$db" = "gstech" && "$tbl" = "sessions" ]]; then
		update_payments_session_ids
	fi
	update_pg_sequences "$db" "$tbl"
	if [[ "$db" = "gstech" && "$tbl" = "users" ]]; then
		insert_idefix_test_user
	fi
}

function resolve_fk_vals {
	db=$1
	tbl=$2
	col=${3-"id"}
	# shellcheck disable=SC2016
	echo -n "$(gojq <"$DATA_DIR/$(pick_from_cache "$db" "$tbl" "1").json" -L"$JQ_DIR" --arg fk "$col" -r 'include "tools"; resolve_fk_vals($fk)')"
}

function drop_tmp_tables {
	local db_url=$1
	exec_sql "$(get_local_url "$db_url")" <<-EOF
		DO \$\$
		DECLARE
			table_name text;
		BEGIN
			FOR table_name IN (
				SELECT tablename
				FROM pg_tables
				WHERE tablename LIKE 'tmp_%'
			)
			LOOP
				EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name) || ' CASCADE';
			END LOOP;
		END \$\$;
	EOF
}

function truncate_tables {
	local db_url=$1
	local tables=("${@:2}")
	local quotedTables
	local joinedQuotedTables
	quotedTables=$(printf '"%s",' "${tables[@]}")
	joinedQuotedTables=$(
		IFS=,
		echo "${quotedTables[*]}"
	)
	local suppress=""
	if [[ -z "$flag_verbose" ]]; then
		suppress="SET client_min_messages TO WARNING;"
	fi
	exec_sql "$(get_local_url "$db_url")" <<-EOF
		$suppress
		TRUNCATE TABLE ${joinedQuotedTables%,} CASCADE;
	EOF
}

function get_filt_qry {
	local filt
	if [ -s "$SQL_FILTER" ]; then
		filt=$(perl -pe 's/--.*?$//mg;s/\/\*.*?\*\///mg;' "$SQL_FILTER")
	fi

	if [ -z "$filt" ]; then
		filt=$(
			cat <<-EOM
				SELECT DISTINCT
					p.id, p."personId"
				FROM
					players p
				WHERE p."id" IN (3857538)
			EOM
		)
	fi
	echo "${filt%';'}"
}

function build_partitioned_query {
	local qry
	local per_part_qry
	local db_url
	local filt_cte
	local tbl
	local parts
	qry=""
	db_url=$1
	tbl=$2
	filt_cte=$3
	per_part_qry=$4
	parts=${5:-2}
	recentParts=$(latest_partitions "$db_url" "$tbl" "$parts")
	for partition in $recentParts; do
		if [ -n "$qry" ]; then
			qry+=" UNION ALL "
		else
			qry+=" WITH t AS ($filt_cte) "
		fi
		qry+=$(
			cat <<-EOM | sed "s/{PARTITION}/$partition/g"
				$per_part_qry
			EOM
		)
	done
	echo "$qry"
}
