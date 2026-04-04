#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

function install_chronic_if_missing {
	if ! ruby -e "require 'chronic'" 2>/dev/null; then
		echo "Installing chronic..."
		gem install --user-install chronic >/dev/null
	fi
}

function knav() {
	verify_aws_session
	local -A named_params
	local args=()
	local env

	while [ $# -gt 0 ]; do
		case "$1" in
		--tail=*)
			named_params["tail"]="${1#*=}"
			shift
			;;
		*)
			args+=("$1")
			shift
			;;
		esac
	done

	if [[ "${args[0]}" = "dev" || "${args[0]}" = "prod" ]]; then
		env="${args[0]}"
		args=("${args[@]:1}")
	fi

	set_k8s_ns "$env"

	local result=""
	for ((i = 0; i < ${#args[@]}; i++)); do
		if [ -z "$result" ]; then
			result="${args[i]}"
		else
			result="$result|${args[i]}"
		fi
	done

	if [[ -z "$result" ]]; then
		echo "$(tput setaf 3)Must provide a search term$(tput sgr0)"
		exit 1
	fi

	local tail
	if [ "${named_params["tail"]+isset}" = "isset" ]; then
		tail="${named_params["tail"]}"
	fi
	local tail_arg
	tail_arg=$(if [ -n "$tail" ]; then echo " --tail=\"$tail\""; fi)

	local cmd
	cmd=$(
		cat <<-EOF
			stern "($result)" -o raw $tail_arg --color never -i "^{"
		EOF
	)
	trimmed_cmd=$(echo "$cmd" | tr -s '[:blank:]' ' ')
	log1 "$trimmed_cmd"
	lnav <(eval "$trimmed_cmd" 2>/dev/null)
}

# TODO: clean up this function
# TODO: setup correct arg logic for logcli command
function lokinav() {
	install_chronic_if_missing
	local -A named_params=()
	local env=""
	local args=()

	local filter=""

	while [ $# -gt 0 ]; do
		case "$1" in
		--from=*)
			named_params["from"]="${1#*=}"
			shift
			;;
		--to=*)
			named_params["to"]="${1#*=}"
			shift
			;;
		--range=*)
			local range="${1#*=}"
			named_params["from"]=${range%-*}
			named_params["to"]=${range#*-}
			shift
			;;
		--since=*)
			named_params["since"]="${1#*=}"
			shift
			;;
		--limit=*)
			named_params["limit"]="${1#*=}"
			shift
			;;
		--batch=*)
			named_params["batch"]="${1#*=}"
			shift
			;;
		--env=*)
			env="${1#*=}"
			shift
			;;
		--lvls=*)
			lvls="${1#*=}"
			shift
			;;
		--match=*)
			filter+="|= \`${1#*=}\` "
			shift
			;;
		--regex=*)
			filter+="|~ \`${1#*=}\` "
			shift
			;;
		--no-match=*)
			filter+="!= \`${1#*=}\` "
			shift
			;;
		--no-regex=*)
			filter+="!~ \`${1#*=}\` "
			shift
			;;
		*)
			args+=("$1")
			shift
			;;
		esac
	done

	if [ -z "$env" ] && [ "${args[0]}" = "dev" ]; then
		env="dev"
		args=("${args[@]:1}")
	elif [ -z "$env" ] && [ "${args[0]}" = "prod" ]; then
		env="prod"
		args=("${args[@]:1}")
	else
		env="prod"
	fi

	# Process positional parameters
	local result=""
	for ((i = 0; i < ${#args[@]}; i++)); do
		if [ -z "$result" ]; then
			result=".*${args[i]}.*"
		else
			result="$result|.*${args[i]}.*"
		fi
	done

	local from
	local to
	if [ "${named_params["from"]+isset}" = "isset" ]; then
		from="${named_params["from"]}"
		if ! date -d "$from" +"%Y-%m-%dT%H:%M:%SZ" &>/dev/null; then
			datetime=$(echo "$from" | ruby -rchronic -e 'puts Chronic.parse(ARGF.read).utc.strftime("%Y-%m-%dT%H:%M:%SZ")')
			from="$datetime"
		fi
	fi

	if [ "${named_params["to"]+isset}" = "isset" ]; then
		to="${named_params["to"]}"
		if ! date -d "$to" +"%Y-%m-%dT%H:%M:%SZ" &>/dev/null; then
			datetime=$(echo "$to" | ruby -rchronic -e 'puts Chronic.parse(ARGF.read).utc.strftime("%Y-%m-%dT%H:%M:%SZ")')
			to="$datetime"
		fi
	fi

	local addr="https://loki.$env.eeg.viegg.net"
	local query
	local from_arg
	local to_arg
	local since_arg
	local cmd
	if [[ -z "$result" ]]; then
		result="$(logcli --quiet --addr="$addr" labels container | gum filter --no-limit | tr '\n' '|')"
	fi
	[[ -z "$result" ]] && exit 1
	query=$(
		cat <<-EOM
			{container=~\`${result%|}\`} $filter | json | line_format \`{{.log}}\` | json | level =~ \`(${lvls:-"error|warn|info|debug"})\`
		EOM
	)
	from_arg=$(if [ -n "$from" ]; then echo " --from=\"$from\""; fi)
	to_arg=$(if [ -n "$to" ]; then echo " --to=\"$to\""; fi)
	since_arg=$(if [ "${named_params["since"]+isset}" = "isset" ]; then echo " --since=${named_params["since"]}"; fi)
	query_hash="$(echo -n "$query" | shasum -a 256 | awk '{print $1}')"
	# --limit=10000 --batch=5000 \
	# TODO: add logic to deduce parallel duration and parallel max workers based on time range
	cmd=$(
		cat <<-EOF
			logcli query --quiet --output=raw --forward \
				--parallel-duration="8h" --parallel-max-workers=4 --merge-parts \
				--part-path-prefix="/tmp/loki_$query_hash" \
				$(if [ -z "$to" ]; then echo "--tail "; fi)\
				--addr="$addr" \
				$from_arg $to_arg $since_arg '$query'
		EOF
	)
	trimmed_cmd=$(echo "$cmd" | tr -s '[:blank:]' ' ')
	echo "$trimmed_cmd" | pbcopy
	lnav <(eval "$trimmed_cmd" 2>/dev/null)
}

function ensure_lnav_setup {
	lnav -i "$LNAV_DIR/idefix_log.json" &&
		rsync -av --exclude='*.json' "$LNAV_DIR"/ "$HOME/.config/lnav/formats/installed/"
	lnav -i "$LNAV_DIR/config.json"
}

function get_logfile_range {
	local logfile="$1"
	if [[ "$logfile" != "$LOGS_DIR"* ]]; then logfile="$LOGS_DIR/$1"; fi
	echo "$(head -n200 "$logfile")$(tail -n200 "$logfile")" |
		gojq -L"$JQ_DIR" -s -r 'include "tools"; logfile_limits'
}

function scan_for_archival {
	local dir="$LOGS_DIR" to_compress=() size_limit="" dur_back="" num_back=""
	for opt in "$@"; do
		case "$opt" in
		--size=*)
			size_limit="${opt#*=}"
			;;
		--age=*)
			dur_back="${opt#*=}"
			;;
		--num=*)
			num_back="${opt#*=}"
			;;
		esac
	done
	local ts_cutoff=$(date +%s) total_size=0 from_ts="" to_ts="" old_mod_files=() \
	all_logs_size="$(calculate_total_size_raw "$LOGS_DIR"/*.json*)"
	local find_cmd=("find" "-L" "$dir" "(" "-name" "*.json" "-o" "-name" "*.json.gz" ")")
	if [[ -n "$size_limit" ]]; then size_limit="$(human_to_bytes "$size_limit")"; fi
	if [[ -n "$dur_back" ]]; then
		dur_back="$(duration_to_seconds "$dur_back")"
		find_cmd+=("-mtime" "+${dur_back}s")
		ts_cutoff=$((ts_cutoff - dur_back))
	fi
	mapfile -t log_files_sorted < <("${find_cmd[@]}" -print0 | xargs -0 gstat -c "%W %n" | sort -nr | cut -d' ' -f2-)
	if arr_contains "$LOGGER_LOCAL" "${log_files_sorted[@]}"; then
		local curr=("$LOGGER_LOCAL")
		read -ra tmp <<<"$(diff_arrays log_files_sorted[@] curr[@])"
		log_files_sorted=("${curr[@]}" "${tmp[@]}")
	fi
	local sel_log_files=("${log_files_sorted[@]}")
	if [[ -n "$num_back" ]]; then
		sel_log_files=("${log_files_sorted[@]:$num_back:${#log_files_sorted[@]}}")
	fi
	declare -A log_files_info
	mapfile -t old_mod_files < <(reverse_array "${sel_log_files[@]}")
	for old_mod in "${old_mod_files[@]}"; do
		mapfile -t limits < <(get_logfile_range "$old_mod")
		if ((limits[1] < ts_cutoff)); then
			log_file_base="$(basename "$old_mod")"
			to_compress+=("$log_file_base")
			file_size=$(gstat -c%s "$old_mod")
			log_files_info["$log_file_base"]="$file_size ${limits[*]}"
			total_size=$((total_size + file_size))
			if [[ -z "$from_ts" || "${limits[0]}" -lt "$from_ts" ]]; then from_ts="${limits[0]}"; fi
			if [[ -z "$to_ts" || "${limits[1]}" -gt "$to_ts" ]]; then to_ts="${limits[1]}"; fi
			if [[ -n "$size_limit" ]] && (((all_logs_size - total_size) < size_limit)); then break; fi
		fi
	done
	local output=""
	if ((total_size > size_limit)) || [[ -z "$size_limit" ]]; then
		local archive_dir="$dir/_archive"
		archive_name="$(gdate -d "@$from_ts" +"%Y%m%dT%H%M%S")-$(gdate -d "@$to_ts" +"%Y%m%dT%H%M%S").tar.gz"
		local comp_cnt="${#to_compress[@]}"
		local total_size_human="$(bytes_to_human "$total_size")"
		output+="$(printf "%s\n%s\n%s" "$archive_name" "$comp_cnt" "$total_size_human")"
		for comp in "${to_compress[@]}"; do
			IFS=" " read -ra comp_info <<<"${log_files_info["$comp"]}"
			local comp_size="$(bytes_to_human_float "${comp_info[0]}")"
			local comp_from="$(gdate -d "@${comp_info[1]}" +"%Y-%m-%d %H:%M:%S")"
			local comp_to="$(gdate -d "@${comp_info[2]}" +"%Y-%m-%d %H:%M:%S")"
			output+="$(printf "\n%s %s %s %s" "$comp" "$comp_size" "$comp_from" "$comp_to")"
		done
	fi
	printf "%s" "$output"
}

function do_archival {
	local archive_dir="$LOGS_DIR/_archive" archive_name="$1" to_compress=("${@:2}")
	mkdir -p "$archive_dir"
	#shellcheck disable=SC2046
	local size_before="$(calculate_total_size_raw $(printf "$LOGS_DIR/%s " "${to_compress[@]}"))"
	if tar -czf "$archive_dir/$archive_name" --directory="$LOGS_DIR" "${to_compress[@]}"; then
		local size_after="$(gstat -c%s "$LOGS_DIR/_archive/$archive_name")"
		local comp_ratio="$(printf "%.2f" "$(bc -l <<<"100 - $size_after/$size_before")")"
		local size_after_human="$(bytes_to_human_float "$size_after")"
		printf "%s ~> %s (%s%%)" "$(bytes_to_human_float "$size_before")" "$size_after_human" "$comp_ratio"
		return 0
	else
		return 1
	fi
}

function archive {
	local jid="$(date +%s)" rm_old_logs="" to_compress=() archive_dir="$LOGS_DIR/_archive"
	if arr_contains "--rm" "$@"; then rm_old_logs="1"; fi
	$IDFX_SPINNER -j="$jid" "Scanning logfiles for archival" <<-EOM && mapfile -t scan_result < <(spin_job_output "$jid")
		$IDFX_ logs scan-for-archive $@
	EOM
	local archive_name="${scan_result[0]}"
	local comp_cnt="${scan_result[1]}"
	local total_size_human="${scan_result[2]}"
	local to_compress_inf=("${scan_result[@]:3}")
	for comp_inf in "${to_compress_inf[@]}"; do
		IFS=" " read -ra comp_info <<<"$comp_inf"
		local comp="${comp_info[0]}"
		local comp_size="${comp_info[1]}"
		local comp_from="${comp_info[2]}"
		local comp_to="${comp_info[3]}"
		to_compress+=("$comp")
	done
	local msg="$(printf "Archiving %s %s (%s) to %s/%s" \
		"$comp_cnt" "$(plural "$comp_cnt" "file")" "$total_size_human" "$archive_dir" "$archive_name")"
	jid="$(date +%s)"
	#shellcheck disable=SC2046
	$IDFX_SPINNER -j="$jid" -fwd "$msg" --ok="Archival complete %s" <<-EOM && if [[ "$rm_old_logs" == "1" ]]; then rm -f $(printf "$LOGS_DIR/%s " "${to_compress[@]}"); fi
		$IDFX_ logs do-archive "$archive_name" $(quote_arr "${to_compress[@]}")
	EOM
}

# TODO: finish implementing this function to auto-vacuum logs
function auto_archive_test {
	local limit="$(human_to_bytes "500M")"
	local tot_size="$(calculate_total_size_raw "$LOGS_DIR"/*.json*)"
	if ((tot_size > limit)); then archive --size="200M" --rm; fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	ensure_lnav_setup &>/dev/null
	case "$1" in
	loki)
		shift
		lokinav "$@"
		;;
	k8s)
		knav "${@:2}"
		;;
	local)
		lnav "$LOGS_DIR"/*.json*
		;;
	do-archive)
		shift
		do_archival "$@"
		;;
	scan-for-archive)
		shift
		scan_for_archival "$@"
		;;
	archive)
		shift
		archive "$@"
		;;
	*)
		lnav "$LOGS_DIR"/*.json*
		;;
	esac
fi
