#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
source "./pg-fns.sh"
source "./resolvers.sh"

function do_prep {
	local db_url=$1
	drop_tmp_tables "$db_url"
	truncate_tables "$db_url" "${@:2}"
}

function run_importer {
	local db_url
	local filt
	local tables
	local db
	db_url=$1
	filt=$2
	tables=("${@:3}")
	db="${db_url##*/}"

	for t in "${tables[@]}"; do
		if [[ -n "$flag_parallel" ]]; then
			exec 200>"$TMP_DIR/$db-$t.lock"
			flock -n 200 || {
				echo "CAN'T ACQUIRE LOCK FOR $db-$t"
				exit 1
			}
		fi
		log1 ""
		print_task_title "$db" "$t"
		local fname
		if [ -n "${flag_cache:x}" ]; then
			fname=$(pick_from_cache "$db" "$t" "$flag_cache")
			log1 -e "$(tput setaf 7)($(basename "$fname"))$(tput sgr0)"
		else
			fname="$db-$t-$(date +%Y-%m-%d-%H-%M-%S)"
			log1 -e "$(tput setaf 1)($fname)$(tput sgr0)"
			local qry
			if [ "$db" = "gstech" ]; then
				qry=$(resolve_gstech_qry "$db_url" "$t" "$filt")
			elif [ "$db" = "campaignserver" ]; then
				qry=$(resolve_campaignserver_qry "$db_url" "$t")
			elif [ "$db" = "rewardserver" ]; then
				qry=$(resolve_rewardserver_qry "$db_url" "$t")
			fi
			download_query_data "$db_url" "$fname" "$t" <<<"$qry"
		fi
		do_import "$db" "$t" "$fname"
		if [[ -n "$flag_parallel" ]]; then
			exec 200>&-
		fi
	done
}
