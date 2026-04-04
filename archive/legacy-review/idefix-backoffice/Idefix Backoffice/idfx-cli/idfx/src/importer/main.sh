#!/usr/bin/env bash
set -e
echo "$$" >>"$PIDS_FILE"

export flag_cache
export flag_skippostclean
export flag_migrate
export flag_partitions
export flag_reset_env
export flag_parallel="1"
export flag_binary="1"
export TRANSFORM_TABLES

ORIG_DIR=$(pwd)
cd "$(dirname "$0")" || exit
# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

function usage {
	check_bash_version
	echo "Usage: idfx import [option...] <db> <tables...>" >&2
	echo "       idfx import [option...] <argset>" >&2
	echo "       idfx import -p [option...] [[db]...]" >&2
	echo
	echo "Options:"
	echo "   -h          Display this help message"
	echo "   -c          Use cached file from most recent run (alias for -C1)"
	echo "   -C[n]       Use cached file from n runs ago"
	echo "   -p          Use multi-threaded approach (default when importing all tables)"
	echo "   -s          Use sequential approach (default when importing select tables)"
	echo "   -P[n]       For partitioned tables, import [n] most recent partitions"
	echo "   -b          Import data using BIN format where possible (default)"
	echo "   -j          Import data using JSON format only (slower, more readable)"
	echo "   -r          Purge the data directory completely (alias for -R0)"
	echo "   -R[n]       Purge the data directory, leave n most recent cached runs"
	echo "   -t          Do not do post-import cleanup"
	echo "   -T          Clean tmp directory and exit"
	echo "   -e          Reset PG service before performing import"
	echo "   -m          Run yarn migrate on gstech after import"
	echo
	echo "Arguments:"
	echo "   <db>        Database shortcode: {gs|cs|rs} (gstech, campaignserver, rewardserver)"
	echo "   <tables...> Space-separated list of table names to process"
	echo "                - order of tables is important, due to foreign key constraints"
	echo "   <argset>    A custom argument set for the script"
	echo "                - preset sets of tables in validated order"
	echo "                - see argsets.sh for more details"
	echo
	echo "Notes:"
	echo "   - Either <db> and <tables> should be provided or <argset> should be provided, but not both."
	echo "   - If -p option is used, all tables will be imported regardless of the <tables...> argument."
	echo "   - When using cache, filter query is naturally ignored, since data is loaded from cache files."
	echo "   - Default for partitioned tables is 2 most recent, and 1 for transactions table."
	echo
	exit "$1"
}

if [[ $# -eq 0 ]]; then
	echo "$(tput setaf 1)Invalid ARGS$(tput sgr0)" >&2
	usage 1
fi

function setup_transformer {
	yq -o=json "$TRANSFORMER_YML" >"$TRANSFORMER_JSON"
	trans_tbls=$(gojq -r 'keys | @sh' "$TRANSFORMER_JSON" 2>/dev/null || echo "")
	TRANSFORM_TABLES="${trans_tbls//\'/}"
}

while getopts ":hcrpsTtbjmeC:R:P:" opt; do
	case $opt in
	C)
		flag_cache="${OPTARG}"
		;;
	c)
		flag_cache="1"
		flag_binary="1"
		;;
	p)
		flag_parallel="1"
		;;
	s)
		unset flag_parallel
		;;
	P)
		flag_partitions="${OPTARG}"
		;;
	R)
		prune_cache "${OPTARG}"
		exit 0
		;;
	r)
		prune_cache
		exit 0
		;;
	T)
		clean_prev_runs
		exit 0
		;;
	t)
		flag_skippostclean="1"
		;;
	b)
		flag_binary="1"
		;;
	j)
		unset flag_binary
		;;
	m)
		flag_migrate="1"
		;;
	e)
		flag_reset_env="1"
		;;
	h)
		usage 0
		;;
	\?)
		echo "Invalid option: -$OPTARG" >&2
		usage 1
		;;
	esac
done
shift $((OPTIND - 1))

if [[ $# -eq 1 && "$1" == "validate-cache" ]]; then
	if "$IMPORTER_DIR/parallel.sh" validate-cache; then
		echo "0"
	else
		echo "1"
	fi
elif [[ $# -eq 2 && "$1" == "list-remote-tables" ]]; then
	list_tables "$2"
else
	start_time=$(date +%s)
	setup_transformer
	if [[ "$flag_parallel" -eq 1 ]]; then
		avail_db_args=("gs" "cs" "rs")
		# shellcheck disable=SC2034
		rcvd_args=("$@")
		IFS=' ' read -ra db_args <<<"$(intersect_arrays avail_db_args[@] rcvd_args[@])"
		if [[ ${#db_args[@]} -eq 0 ]]; then db_args=("${avail_db_args[@]}"); fi
		if [[ "$flag_reset_env" -eq 1 ]]; then
			IFS=' ' read -ra missing_dbs <<<"$(diff_arrays avail_db_args[@] db_args[@])"
			if [[ ${#missing_dbs} -ne 0 ]]; then
				action="$(gum choose --limit=1 \
					--header "'-e' flag will reset all DBs, but you're only importing some." \
					"Continue" "Import all" "Cancel")"
				case "$action" in
				"Continue") true ;;
				"Import all") db_args+=("${missing_dbs[@]}") ;;
				"Cancel") exit 0 ;;
				esac
			fi
			"$LAUNCHER_DIR/main.sh" env pg
		fi
		$IDFX_SPINNER "Running pre-import chores" <<-EOM
			$IMPORTER_DIR/parallel.sh pre-import $(quote_arr "${db_args[@]}")
		EOM
		"$IMPORTER_DIR/parallel.sh" "${db_args[@]}"
	else
		if [[ -z "$flag_verbose" ]]; then flag_verbose="1"; fi
		clean_prev_runs
		"./importer.sh" "$@"
	fi
	if [[ -z "$flag_skippostclean" ]]; then empty_tmp_dir; fi
	end_time=$(date +%s)
	duration=$(print_duration "$start_time" "$end_time")
	echo "Data imported in $duration$([[ $flag_cache -eq 1 ]] && echo " (from cache)" || echo "")"
fi

cd "$ORIG_DIR" || exit

if [[ $flag_migrate -eq 1 ]]; then
	$IDFX_SPINNER "Running post-import chores" <<-EOM
		$LAUNCHER_DIR/main.sh migrate
	EOM
fi
