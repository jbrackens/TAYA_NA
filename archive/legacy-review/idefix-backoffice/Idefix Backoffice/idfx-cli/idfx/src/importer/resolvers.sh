#!/usr/bin/env bash
set -e

function resolve_gstech_qry {
	local db_url
	local db
	local tbl
	local filt_cte
	local qry
	db_url=$1
	db="${db_url##*/}"
	tbl=$2
	filt_cte=$3
	qry=$(printf 'with t as (%s)\n' "$filt_cte")
	filt_cond='select "id" from players p where p.id in (select id from t) or p."personId" in (select "personId" from t)'
	case $tbl in
	players)
		qry+=$(
			cat <<-EOM
				select * from players p where p.id in (select id from t) or p."personId" in (select "personId" from t)
			EOM
		)
		;;
	player_frauds)
		qry+=$(
			cat <<-EOM
				select * from "player_frauds" pf where pf."playerId" in ($filt_cond)
			EOM
		)
		;;
	player_bonuses)
		qry+=$(
			cat <<-EOM
				select * from "player_bonuses" pb where pb."playerId" in ($filt_cond)
			EOM
		)
		;;
	player_questionnaires)
		qry+=$(
			cat <<-EOM
				select * from "player_questionnaires" pq where pq."playerId" in ($filt_cond)
			EOM
		)
		;;
	player_questionnaire_answers)
		qry+=$(
			cat <<-EOM
				select * from "player_questionnaire_answers" pqa
				where pqa."playerQuestionnaireId" in (
					select pq."id" from "player_questionnaires" pq where pq."playerId" in ($filt_cond)
				)
			EOM
		)
		;;
	player_limits)
		qry+=$(
			cat <<-EOM
				select * from "player_limits" pl where pl."playerId" in ($filt_cond)
			EOM
		)
		;;
	persons)
		qry+=$(
			cat <<-EOM
				select * from persons p where p.id in (select "personId" from t)
			EOM
		)
		;;
	player_events)
		qry+=$(
			cat <<-EOM
				select * from "player_events" pe where pe."playerId" in ($filt_cond)
			EOM
		)
		;;
	report_daily_player_game_summary)
		qry+=$(
			cat <<-EOM
				select * from "report_daily_player_game_summary" rdpg where rdpg."playerId" in ($filt_cond)
			EOM
		)
		;;
	accounts)
		qry+=$(
			cat <<-EOM
				select * from "accounts" a where a."playerId" in ($filt_cond)
			EOM
		)
		;;
	payments)
		qry+=$(
			cat <<-EOM
				select * from "payments" p where p."playerId" in ($filt_cond)
			EOM
		)
		;;
	player_segments)
		qry+=$(
			cat <<-EOM
				select * from "player_segments" ps where ps."playerId" in ($filt_cond)
			EOM
		)
		;;
	player_counters)
		qry+=$(
			cat <<-EOM
				select * from "player_counters" pc where pc."playerId" in ($filt_cond)
			EOM
		)
		;;
	kyc_requests)
		qry+=$(
			cat <<-EOM
				select * from "kyc_requests" kr where kr."playerId" in ($filt_cond)
			EOM
		)
		;;
	kyc_documents)
		qry+=$(
			cat <<-EOM
				select * from "kyc_documents" kd where kd."playerId" in ($filt_cond)
			EOM
		)
		;;
	sessions)
		qry+=$(
			cat <<-EOM
				select ss.* from "sessions" ss
				where ss."playerId" in ($filt_cond)
				and (
					ss.timestamp >= date_trunc('month', CURRENT_DATE) - interval '3 month'
					OR
					ss."id" in $(resolve_fk_vals "$db" "payments" "sessionId")
				)
			EOM
		)
		;;
	manufacturer_sessions)
		qry+=$(
			cat <<-EOM
				select ms.* from "manufacturer_sessions" ms
				left join "sessions" ss on ss.id = ms."sessionId"
				where ss."playerId" in ($filt_cond) and ms."sessionId" in $(resolve_fk_vals "$db" "sessions")
			EOM
		)
		;;
	report_daily_games_brands)
		qry=$(
			cat <<-EOM
				select * from report_daily_games_brands rdgb
				where rdgb."updatedAt" >= date_trunc('month', CURRENT_DATE) - interval '1 month'
			EOM
		)
		;;
	report_daily_brands)
		qry=$(
			cat <<-EOM
				select * from report_daily_brands rdb
				where rdb."updatedAt" >= date_trunc('month', CURRENT_DATE) - interval '1 month'
			EOM
		)
		;;
	game_rounds)
		qry=$(
			build_partitioned_query "$db_url" "$tbl" "$filt_cte" "$(
				cat <<-EOM
					select gr.* from {PARTITION} gr
					left join "manufacturer_sessions" ms on ms.id = gr."manufacturerSessionId"
					left join "sessions" ss on ss.id = ms."sessionId"
					where ss."playerId" in ($filt_cond)
					and gr."manufacturerSessionId" in $(resolve_fk_vals "$db" "manufacturer_sessions")
				EOM
			)" "${flag_partitions:-2}"
		)
		;;
	transactions)
		qry=$(
			build_partitioned_query "$db_url" "$tbl" "$filt_cte" "$(
				cat <<-EOM
					select * from {PARTITION} tx where tx."playerId" in ($filt_cond)
				EOM
			)" "${flag_partitions:-1}"
		)
		;;
	report_hourly_players)
		qry=$(
			build_partitioned_query "$db_url" "$tbl" "$filt_cte" "$(
				cat <<-EOM
					select * from {PARTITION} rhp where rhp."playerId" in ($filt_cond)
				EOM
			)" "${flag_partitions:-2}"
		)
		;;
	account_statements)
		qry=$(
			build_partitioned_query "$db_url" "$tbl" "$filt_cte" "$(
				cat <<-EOM
					select * from {PARTITION} ac where ac."playerId" in ($filt_cond)
				EOM
			)" "${flag_partitions:-2}"
		)
		;;
	*)
		qry=$(printf 'select * from "%s"' "$tbl")
		;;
	esac
	echo "$qry"
}

function resolve_campaignserver_qry {
	local db_url
	local db
	local tbl
	local qry
	local gsPlayerIds
	db_url=$1
	tbl=$2
	db="${db_url##*/}"
	gsPlayerIds=$(resolve_fk_vals "gstech" "players")
	case $tbl in
	subscription_options)
		qry=$(
			cat <<-EOM
				select * from subscription_options where id in (
					select "subscriptionOptionsId" from players p where p."externalId" in $gsPlayerIds
				)
			EOM
		)
		;;
	players)
		qry=$(
			cat <<-EOM
				select * from players p where p."externalId" in $gsPlayerIds
			EOM
		)
		;;
	deposits)
		qry=$(
			cat <<-EOM
				select * from deposits d where d."externalPlayerId" in $gsPlayerIds
			EOM
		)
		;;
	campaigns_players)
		qry=$(
			cat <<-EOM
				select * from campaigns_players cp where cp."playerId" in $(resolve_fk_vals "$db" "players")
			EOM
		)
		;;
	audience_rules)
		qry=$(
			cat <<-EOM
				select * from audience_rules ar
				where ar."campaignId" in $(resolve_fk_vals "$db" "campaigns_players" "campaignId")
				or ar."campaignId" in (
					select c."id"
					from "campaigns" c
					where c."startTime" >= now() - interval '3 months'
					or c."endTime" >= now() - interval '3 months'
				)
			EOM
		)
		;;
	events)
		qry=$(
			cat <<-EOM
				select * from events e where e."playerId" in $(resolve_fk_vals "$db" "players")
			EOM
		)
		;;
	credited_rewards)
		qry=$(
			cat <<-EOM
				SELECT * FROM credited_rewards cr WHERE cr."playerId" in $(resolve_fk_vals "$db" "players")
			EOM
		)
		;;
	campaigns_deposits)
		qry=$(
			cat <<-EOM
				select * from campaigns_deposits cd where cd."depositId" in $(resolve_fk_vals "$db" "deposits")
			EOM
		)
		;;
	*) # content_type content countries campaign_groups
		qry=$(printf 'select * from "%s"' "$tbl")
		;;
	esac
	echo "$qry"
}

function resolve_rewardserver_qry {
	local db_url
	local db
	local tbl
	local qry
	local gsPlayerIds
	db_url=$1
	tbl=$2
	db="${db_url##*/}"
	gsPlayerIds=$(resolve_fk_vals "gstech" "players")
	case $tbl in
	ledgers)
		qry=$(
			cat <<-EOM
				select * from ledgers l where l."playerId" in $gsPlayerIds
			EOM
		)
		;;
	progresses)
		qry=$(
			cat <<-EOM
				select * from progresses p where p."playerId" in $gsPlayerIds
			EOM
		)
		;;
	progresses_ledgers)
		qry=$(
			cat <<-EOM
				select * from progresses_ledgers pl where pl."playerId" in $gsPlayerIds
			EOM
		)
		;;
	progresses_rewards)
		qry=$(
			cat <<-EOM
				select * from progresses_rewards pr where pr."progressId" in $(resolve_fk_vals "$db" "progresses")
			EOM
		)
		;;
	game_progresses)
		# this is faster than using "playerId"
		qry=$(
			cat <<-EOM
				select * from game_progresses gp where gp."progressId" in $(resolve_fk_vals "$db" "progresses")
			EOM
		)
		;;
	ledgers_events)
		qry=$(
			cat <<-EOM
				select * from ledgers_events le where le."ledgerId" in $(resolve_fk_vals "$db" "ledgers")
			EOM
		)
		;;
	*) # thumbnails games reward_definitions rewards
		qry=$(printf 'select * from "%s"' "$tbl")
		;;
	esac
	echo "$qry"
}
