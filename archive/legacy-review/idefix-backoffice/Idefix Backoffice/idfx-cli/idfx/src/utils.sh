#!/usr/bin/env bash

function quote_arr {
	printf "\"%s\" " "${@}"
}

function reverse_array {
	printf '%s\n' "${@}" | tac
}

function spin_job_fname {
	printf "%s/%s%s" "$TMP_DIR" "$1" "$SPIN_OUT_FEXT"
}

function human_to_bytes {
	local os=$(uname -s) human_size=$1
	local cmd=("numfmt" "--from=iec" "$human_size")
	if [[ "$os" == "Darwin" ]]; then cmd[0]="gnumfmt"; fi
	"${cmd[@]}"
}

function bytes_to_human {
	local os=$(uname -s) byte_size=$1
	local cmd=("numfmt" "--to=iec" "$byte_size")
	if [[ "$os" == "Darwin" ]]; then cmd[0]="gnumfmt"; fi
	"${cmd[@]}"
}

function bytes_to_human_float {
	echo "$1" |
		awk '{ split("B K M G", v); s=1; while($1>=1024){ $1/=1024; s++ } printf("%.2f%s", $1, v[s]) }'
}

function plural {
	local num=$1 word=$2
	local word_plural=${3:-"${word}s"}
	if [[ $num -eq 1 ]]; then
		echo "$word"
	else echo "$word_plural"; fi
}

function spin_job_output {
	local opts=() args=()
	for a in "${@}"; do
		if [[ "$a" = "-"* ]]; then
			opts+=("$a")
		else
			args+=("$a")
		fi
	done
	local jid="${args[0]}"
	local output_file="$(spin_job_fname "$jid")"
	if [[ ! -f "$output_file" ]]; then return 1; fi
	local output_content=$(awk /./ "$output_file")
	if arr_contains "-d" "${opts[@]}"; then rm "$output_file"; fi
	if arr_contains "-ol" "${opts[@]}"; then
		echo "$output_content" | tr '\n' ' '
	else
		echo -n "$output_content"
	fi
}

function copy_to_clipboard {
	local os=$(uname -s)
	local string_to_copy="$1"

	if [[ "$os" == "Darwin" ]]; then
		echo "$string_to_copy" | pbcopy
	elif [[ "$os" == "Linux" ]]; then
		if command -v xclip >/dev/null 2>&1; then
			echo "$string_to_copy" | xclip -selection clipboard
		elif command -v xsel >/dev/null 2>&1; then
			echo "$string_to_copy" | xsel --clipboard
		else
			log2 "Clipboard copy not supported on Linux. Please install xclip or xsel."
			return 1
		fi
	else
		log2 "Clipboard copy not supported on this operating system."
		return 1
	fi
}

function brand_codes {
	case $1 in
	vb) echo "vb" ;;
	ld) echo "ld" ;;
	cj) echo "cj" ;;
	os) echo "os" ;;
	sn | fs) echo "sn" ;;
	kk | jw) echo "kk" ;;
	fk | hs) echo "fk" ;;
	*) echo "$1" ;;
	esac
}

function verify_aws_session {
	if [[ -z "$AWS_VAULT" ]]; then
		echo "$(tput setaf 3)Must be run from within an aws-vault authenticated shell$(tput sgr0)"
		exit 1
	fi
}

function set_k8s_ns {
	verify_aws_session
	local wanted_env="$1"
	local curr_env
	curr_env="$(kubectl config view --minify --output 'jsonpath={..namespace}')"
	if [[ "$curr_env" != "$wanted_env" ]]; then
		local -r wanted_context="luckydino-$wanted_env-cluster"
		local -r wanted_namespace="$wanted_env"
		echo "Switching context -> luckydino-$wanted_env-cluster"
		kubectl config use-context "$wanted_context" >/dev/null
		echo "Switching namespace -> $wanted_namespace"
		kubectl config set-context --current --namespace="$wanted_namespace" >/dev/null
	fi
}

function get_local_url {
	local db_url=$1
	local db="${db_url##*/}"
	echo "postgresql://root:1234@localhost/$db"
}

function get_conn_url {
	local db=$1
	case $db in
	gs)
		echo "postgresql://$GSTECH_PG_USER:$GSTECH_PG_PASSWD@$GSTECH_PG_HOST/gstech"
		;;
	rs)
		echo "postgresql://$REWARDSERVER_PG_USER:$REWARDSERVER_PG_PASSWD@$REWARDSERVER_PG_HOST/rewardserver"
		;;
	cs)
		echo "postgresql://$CAMPAIGNSERVER_PG_USER:$CAMPAIGNSERVER_PG_PASSWD@$CAMPAIGNSERVER_PG_HOST/campaignserver"
		;;
	gsb)
		echo "postgresql://$GSTECH_BETA_PG_USER:$GSTECH_BETA_PG_PASSWD@$GSTECH_BETA_PG_HOST/gstech"
		;;
	af) db="affmore" ;; # not implemented
	esac
}

function exec_sql {
	local qry
	local db_url=$1
	local cmd=("psql" "-t" "-A")
	qry=$(cat)
	# if [[ -n "$flag_quiet" && (-z "$flag_verbose" || -z "$IDFX_VERBOSE") ]]; then
	# shellcheck disable=SC2154
	if [[ $flag_verbose -lt 2 ]]; then cmd+=("-q"); fi
	"${cmd[@]}" "${@:2}" "$db_url" <<-EOM
		$qry
	EOM
}

function list_tables {
	local tables
	local db=$1
	local db_url="$(get_conn_url "$db")"
	while IFS= read -r line; do
		tables+=("$line")
	done < <(
		exec_sql "$db_url" <<-EOF
			SELECT tablename
			FROM pg_tables
			WHERE schemaname = 'public' AND
				tablename NOT LIKE 'pg_%' AND
				tablename NOT LIKE '%_default' AND
				tablename NOT SIMILAR TO '%[0-9]+' AND
				tablename NOT SIMILAR TO '%p[0-9]{4}_[0-9]{2}';
		EOF
	)
	for table in "${tables[@]}"; do
		echo "$table"
	done
}

function check_content_db {
	# TODO this check can probably be made more robust
	local content_count
	content_count="$(
		exec_sql "$(get_local_url "campaignserver")" <<-EOM 2>/dev/null
			SELECT count(*) from "content";
		EOM
	)"
	if [[ "$content_count" -eq 0 ]]; then return 1; fi
	return 0
}

function obfuscate {
	local str=$1
	local len=${#str}
	local obf
	local i
	for ((i = 0; i < len; i++)); do
		obf+="*"
	done
	echo "$obf"
}

function get_shell_profile {
	local shell_path
	case "$SHELL" in
	*/bash)
		shell_path="$HOME/.bashrc"
		;;
	*/zsh)
		if [[ -n "$ZDOTDIR" ]]; then
			shell_path="$ZDOTDIR/.zshrc"
		else
			shell_path="$HOME/.zshrc"
		fi
		;;
	*)
		echo "Unsupported shell: $SHELL"
		return 1
		;;
	esac
	echo "$shell_path"
}

function add_to_path {
	local shell_path
	local dir="$1"
	shell_path=$(get_shell_profile)
	if [[ ":$PATH:" != *":$dir:"* ]]; then
		echo "export PATH=\"\$PATH:$dir\"" >>"$shell_path"
		export PATH="$dir:$PATH"
		echo "idfx linked. Reopen your shell or source $shell_path."
	else
		echo "idfx already linked."
	fi
}

function dbg {
	for arg in "$@"; do
		printf "%s\n" "$arg" >>"$DBG_FILE"
	done
	# printf "%s\n" "$*" >>"$DBG_FILE"
}

function dbgf {
	printf "%s\n" "$*" >"$DBG_FILE"
}

function get_file_extension {
	local fname=$1
	local full_name
	local fext
	full_name=$(find -L "$DATA_DIR" -type f -name "$fname.*")
	fext=${full_name##*.}
	echo "$fext"
}

function arr_sort {
	IFS=$'\n' sorted_tmp=$(sort <<<"${*}")
	IFS=',' read -ra sorted <<<"$(echo -n "$sorted_tmp" | tr '\n' ',')"
	echo "${sorted[@]}"
}

function arr_contains {
	local search=$1
	local item
	for item in "${@:2}"; do
		if [[ "$item" == "$search" ]]; then
			return 0
		fi
	done
	return 1
}

function verify_cache {
	local db_url=$1
	local db
	local cache_misses=()
	db="${db_url##*/}"
	for tbl in "${@:2}"; do
		file_found=$(find -L "$DATA_DIR" -type f -name "${db}-${tbl}-*")
		if [[ -z "$file_found" ]]; then
			cache_misses+=("$db.$tbl")
		fi
	done

	if [[ ${#cache_misses[@]} -gt 0 ]]; then
		for miss in "${cache_misses[@]}"; do
			echo "CACHE MISS: $miss"
		done
		exit 1
	fi
}

function check_bash_version {
	local major_version=${BASH_VERSION%%.*}
	if [[ "$major_version" -ne 5 ]]; then
		echo "$(tput setaf 3)Warning: Program developed using bash v5, found ${BASH_VERSION}, consider upgrading to ensure compatibility.$(tput sgr0)"
	else
		echo "bash v${BASH_VERSION}"
	fi
}

function colorize {
	local msg="$1"
	# local BOLD='\033[1m'
	# local ITALIC='\033[3m'
	# local UNDERLINE='\033[4m'
	# local RED='\033[0;31m'
	# local GREEN='\033[0;32m'
	# local YELLOW='\033[0;33m'
	# local BLUE='\033[0;34m'
	# local MAGENTA='\033[0;35m'
	# local CYAN='\033[0;36m'
	# local WHITE='\033[0;37m'
	# local RED_BG='\033[0;41m'
	# local GREEN_BG='\033[0;42m'
	# local YELLOW_BG='\033[0;43m'
	# local BLUE_BG='\033[0;44m'
	# local MAGENTA_BG='\033[0;45m'
	# local CYAN_BG='\033[0;46m'
	# local WHITE_BG='\033[0;47m'
	# local RESET='\033[0m'

	# msg="${msg//:r:/$RED}"
	msg="${msg//:r:/$(tput setaf 1)}"
	msg="${msg//:g:/$(tput setaf 2)}"
	msg="${msg//:y:/$(tput setaf 3)}"
	msg="${msg//:b:/$(tput setaf 4)}"
	msg="${msg//:m:/$(tput setaf 5)}"
	msg="${msg//:c:/$(tput setaf 6)}"
	msg="${msg//:w:/$(tput setaf 7)}"
	msg="${msg//:rb:/$(tput setab 1)}"
	msg="${msg//:gb:/$(tput setab 2)}"
	msg="${msg//:yb:/$(tput setab 3)}"
	msg="${msg//:bb:/$(tput setab 4)}"
	msg="${msg//:mb:/$(tput setab 5)}"
	msg="${msg//:cb:/$(tput setab 6)}"
	msg="${msg//:wb:/$(tput setab 7)}"
	msg="${msg//:bd:/$(tput bold)}"
	msg="${msg//:su:/$(tput smul)}"
	msg="${msg//:eu:/$(tput rmul)}"
	msg="${msg}$(tput sgr0)"
	echo -e "$msg"
}

function log {
	for m in "$@"; do
		echo -n "$(colorize "$m")"
		echo -n " "
	done
	echo ""
}

function log1 {
	# shellcheck disable=SC2154
	if [[ $flag_verbose -ge 1 ]]; then echo "$@"; fi
}

function log2 {
	# shellcheck disable=SC2154
	if [[ $flag_verbose -ge 2 ]]; then echo "$@"; fi
}

function log3 {
	# shellcheck disable=SC2154
	if [[ $flag_verbose -ge 3 ]]; then echo "$@"; fi
}

function print_task_title {
	local db=$1
	local t=$2
	local color
	local cache
	local pid="$!"
	[[ -z "$pid" ]] && pid="$$"
	local pidcolor
	local pidstr
	pidcolor=$((pid % 6 + 1))
	if [ "$db" = "gstech" ]; then
		color=4
	elif [ "$db" = "campaignserver" ]; then
		color=5
	elif [ "$db" = "rewardserver" ]; then
		color=6
	fi
	pidstr=$(tput setaf $pidcolor)$pid$(tput setaf $color)
	if [[ -n "$flag_cache" ]]; then
		cache="(from cache)"
	fi
	if [[ -n "$flag_parallel" ]]; then
		echo -e "$(tput setaf $color)[$pidstr] $db.$t $cache $(tput sgr0)"
	else
		echo -e "$(tput setaf $color) $db.$t $cache $(tput sgr0)"
	fi
}

function duration_to_seconds() {
	local duration=$1
	if [[ $duration == *d ]]; then
		echo $((${duration%d} * 24 * 60 * 60))
	elif [[ $duration == *h ]]; then
		echo $((${duration%h} * 60 * 60))
	elif [[ $duration == *m ]]; then
		echo $((${duration%m} * 60))
	elif [[ $duration == *s ]]; then
		echo "${duration%s}"
	else
		echo "$duration"
	fi
}

function print_duration {
	local start_time=$1
	local end_time=$2
	local duration=$((end_time - start_time))
	hours=$((duration / 3600))
	minutes=$(((duration % 3600) / 60))
	seconds=$((duration % 60))
	printf "%02d:%02d:%02d (hh:mm:ss)\n" $hours $minutes $seconds
}

function human_duration {
	local start_time=$1
	local end_time=${2:-$(date +%s)}
	local duration=$((end_time - start_time))
	hours=$((duration / 3600))
	minutes=$(((duration % 3600) / 60))
	seconds=$((duration % 60))
	((hours > 0)) && printf '%02dh' $hours
	((minutes > 0)) && printf '%02dm' $minutes
	((seconds > 0)) && printf '%02ds' $seconds
}

function round_human_duration {
	local start_time=$1
	local end_time=${2:-$(date +%s)}
	local duration=$((end_time - start_time))
	local neg_dur
	if [[ $duration -lt 0 ]]; then
		neg_dur=1
		duration=$((duration * -1))
	fi
	hours=$(printf '%.0f' "$(bc -l <<<"$duration / 3600")")
	minutes=$(((duration % 3600) / 60))
	seconds=$((duration % 60))
	((neg_dur == 1)) && printf '-'
	((hours > 0)) && printf '%dh' "$hours"
	((minutes > 0 && hours < 1)) && printf '%dm' $minutes
	((seconds > 0 && minutes < 1 && hours < 1)) && printf '%02ds' $seconds
}

function dedupe_array {
	local array=()
	local value
	for value in "$@"; do
		if ! printf '%s\n' "${array[@]}" | grep -q -E "^${value}$"; then
			array+=("$value")
		fi
	done
	echo "${array[@]}"
}

function intersect_arrays {
	local array1=("${!1}")
	local array2=("${!2}")
	local intersection=()
	for i in "${array1[@]}"; do
		for j in "${array2[@]}"; do
			if [[ $i = "$j" ]]; then
				intersection+=("$i")
				break
			fi
		done
	done
	echo "${intersection[@]}"
}

function diff_arrays {
	local array1=("${!1}")
	local array2=("${!2}")
	local diff=()
	for i in "${array1[@]}"; do
		local found=0
		for j in "${array2[@]}"; do
			if [[ $i = "$j" ]]; then
				found=1
				break
			fi
		done
		if [[ $found -eq 0 ]]; then
			diff+=("$i")
		fi
	done
	echo "${diff[@]}"
}

function calculate_total_size_raw {
	local files=("$@")
	local total=0
	for file in "${files[@]}"; do
		size=$(stat -f%z "$file")
		total=$((total + size))
	done
	echo "$total"
}

function calculate_total_size {
	bytes_to_human_float "$(calculate_total_size_raw "$@")"
}

function prune_cache {
	local num="${1:-0}"
	echo "Pruning cache, leaving most recent $num entries"
	local dir="$DATA_DIR"
	local processed_combinations=()
	local prune_files=()
	local cache_files
	mapfile -t cache_files < <(find -L "$dir" -maxdepth 1 -type f \( -name "*.json" -o -name "*.bin" \) -exec stat -f "%m %N" {} \; | sort -nr | cut -d' ' -f 2-)
	for filepath in "${cache_files[@]}"; do
		if [[ -f $filepath ]]; then
			filename=$(basename "$filepath")
			IFS='-' read -r -a parts <<<"$filename"
			prefix="${parts[0]}-${parts[1]}"

			if arr_contains "$prefix" "${processed_combinations[@]}"; then
				continue
			fi

			local sorted_files
			mapfile -t sorted_files < <(find -L "$dir" -maxdepth 1 -type f -name "$prefix-????-??-??-??-??-??.*" -exec stat -f "%m %N" {} \; | sort -nr | cut -d' ' -f 2-)

			if [[ ${#sorted_files[@]} -gt $num ]]; then
				to_remove=("${sorted_files[@]:$num}")
				for f in "${to_remove[@]}"; do
					prune_files+=("$f")
				done
			fi

			processed_combinations+=("$prefix")
		fi
	done

	local num_prune_files=${#prune_files[@]}
	if [[ $num_prune_files -gt 0 ]]; then
		local pruned_size
		pruned_size=$(calculate_total_size "${prune_files[@]}")
		rm "${prune_files[@]}"
		echo "Pruned ${#prune_files[@]} files ($pruned_size)"
	fi
}

function purge_data_dir {
	echo "Purging data directory... $DATA_DIR"
	local num_files
	local total_size
	if [[ -d "$DATA_DIR" ]]; then
		num_files=$(find -L "$DATA_DIR" -maxdepth 1 -type f \( -name "*.json" -o -name "*.bin" \) 2>/dev/null | wc -l)
		if ((num_files > 0)); then
			total_size=$(du -ch "$DATA_DIR"/*.json "$DATA_DIR"/*.bin 2>/dev/null | grep total | cut -f 1)
			rm -f "$DATA_DIR"/*.json "$DATA_DIR"/*.bin
			echo "Deleted $num_files files totaling $total_size."
		else
			echo "Nothing to delete."
		fi
	fi
}

function find_from_cache {
	local db=$1
	local t=$2
	local flag_cache=$3
	if [ -n "${flag_cache:x}" ]; then
		latest_file=$(find -L "$DATA_DIR" -name "$db-$t-*" -print0 | xargs -0 stat -f "%m %N" | sort -rn | head -1 | cut -f2- -d" ")
		file_to_use=$(find -L "$DATA_DIR" -name "$db-$t-*" -print0 | xargs -0 stat -f "%m %N" | sort -rn | head -"$flag_cache" | tail -1 | cut -f2- -d" ")
		fname=$(basename "$file_to_use" ".${file_to_use##*.}")
		echo "$(tput setaf 4)$fname$(tput sgr0) ($flag_cache entries ... $(basename "$latest_file" ".${latest_file##*.}"))"
	fi
	echo "$fname"
}

function pick_from_cache {
	fname=$(find_from_cache "$@" | tail -1)
	echo "$fname"
}

function empty_tmp_dir {
	rm -f "$TMP_DIR"/_parsed_*.json
	rm -f "$TMP_DIR"/*.lock
}

function clean_prev_runs {
	if [[ -d "$TMP_DIR" ]]; then
		empty_tmp_dir
	else
		mkdir -p "$TMP_DIR"
	fi
}

function list_patches {
	local patch
	for patch in "$PATCHES_DIR"/*.patch; do
		patch=${patch%.patch}
		patch=${patch##*patches/}
		echo "$patch"
	done
}

function exists_with_content {
	local file=$1
	if [[ ! -f "$file" ]]; then
		return 1
	fi
	if [ -s "$file" ] && ! [[ $(<"$file") == $'\n' || -z $(<"$file") ]]; then
		return 0
	fi
	return 1
}

function strip_escapes {
	local msg=$1
	echo -e "$msg" |
		gsed -r "s/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]//g"
}

function strip_colors {
	local no_colors
	local colored_string="$1"
	no_colors=$(echo "$colored_string" | sed 's/\x1b\[[0-9;]*m//g')
	echo "$no_colors"
}

function greyscale {
	local msg=$1
	echo -e "$msg" |
		gsed -r "s/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]/\x1B[0;37\2m/g" |
		gsed -r "s/(\x1B\[[0-9;]*[mGK])?([[:print:]\t]*?)(\x1B\[[0-9;]*[mGK]|$)/\1\x1B[0;37m\2\x1B[m\3/g"
}

function center_align {
	local msg=$1
	local stripped_msg=$(strip_escapes "$msg")
	local msg_len=${#stripped_msg}
	local vp_w=$(tput cols)
	local pad_len=$(((vp_w - msg_len) / 2))
	printf "%${pad_len}s%s%${pad_len}s" '' "$msg" ''
}
