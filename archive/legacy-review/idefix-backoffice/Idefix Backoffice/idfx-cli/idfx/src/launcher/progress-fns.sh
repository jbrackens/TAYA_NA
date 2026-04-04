#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./task-fns.sh
source "$LAUNCHER_DIR/task-fns.sh"
# shellcheck source=../interceptor/fns.sh
source "$INTRCPTR_DIR/fns.sh"
# shellcheck source=./signals.sh
source "$LAUNCHER_DIR/signals.sh"

function check_environment {
	local problems=()
	declare -A reqd_servs=(
		["kafka"]="kafka-gstech gstech-kafka gstech-zookeeper"
		["redis"]="gstech-redis"
		["minio"]="gstech-minio"
		["postgres"]="gstech-postgres"
	)
	for serv in "${!reqd_servs[@]}"; do
		local names_states
		local dkr_cmd=("docker" "ps" "-a" "--format" "{{.Names}} {{.State}}")
		IFS=' ' read -ra names <<<"${reqd_servs[$serv]}"
		for name in "${names[@]}"; do
			dkr_cmd+=("-f" "name=$name")
		done
		mapfile -t names_states < <("${dkr_cmd[@]}")
		if [[ "${#names_states[@]}" -eq 0 ]] && ! arr_contains "$serv" "${problems[@]}"; then
			problems+=("$serv")
		fi
		for name_state in "${names_states[@]}"; do
			local name
			local state
			name="${name_state%% *}"
			state="${name_state##* }"
			if [[ $state != "running" ]] && ! arr_contains "$serv" "${problems[@]}"; then
				problems+=("$serv")
			fi
		done
	done
	printf "%s\n" "${problems[@]}"
	if [[ ${#problems[@]} -gt 0 ]]; then return 1; fi
}

function check_docker_env {
	local problems=()
	declare -A reqd_servs=(
		["kafka"]="kafka-gstech gstech-kafka gstech-zookeeper"
		["redis"]="gstech-redis"
		["minio"]="gstech-minio"
		["postgres"]="gstech-postgres"
	)
	for serv in "${!reqd_servs[@]}"; do
		local names_states
		local dkr_cmd=("docker" "ps" "-a" "--format" "{{.Names}} {{.State}}")
		IFS=' ' read -ra names <<<"${reqd_servs[$serv]}"
		for name in "${names[@]}"; do
			dkr_cmd+=("-f" "name=$name")
		done
		mapfile -t names_states < <("${dkr_cmd[@]}")
		for name_state in "${names_states[@]}"; do
			local name
			local state
			name="${name_state%% *}"
			state="${name_state##* }"
			if [[ $state != "running" ]] && ! arr_contains "$serv" "${problems[@]}"; then
				problems+=("$serv")
			fi
		done
	done
	local require_pg_import
	if [[ ${#problems[@]} -eq 0 ]]; then
		if check_content_db; then
			return 0
		else
			require_pg_import="YES"
		fi
	fi
	if [[ ${#problems[@]} -gt 0 ]]; then
		gum style \
			--width=50 \
			--padding="0 2" \
			--border=rounded \
			--border-foreground=63 \
			--align=center \
			"$(printf 'I need these services to be running though...\n\n%s' "${problems[*]}")"
		if gum confirm "Would you like me to start them?"; then
			if arr_contains "postgres" "${problems[@]}"; then
				require_pg_import="YES"
			fi
			$IDFX_SPINNER "Starting required services" <<-EOM
				$PROGRESS_FNS env $(quote_arr "${problems[@]}")
			EOM
		else
			echo "Launch Aborted."
			exit 1
		fi
	fi
	if [[ $require_pg_import == "YES" ]]; then
		echo "Need to import data to postgres for things to work..."
		local import_cmd=("$IDFX_" "import" "-p" "-m")
		if "$IDFX_" "import" "validate-cache"; then
			if gum confirm "Would you like use local cache for import?"; then
				import_cmd+=("-c")
			fi
		fi
		"${import_cmd[@]}"
	fi
}

function setup_vscode {
	echo "Scaffolding vscode launch.json..."
	local tmp_incoming="$TMP_DIR/.incoming.json"
	local tmp_outgoing="$TMP_DIR/.outgoing.json"

	local launch_file="$ASSET_DIR/vscode.json"
	envsubst <"$launch_file" >"$tmp_outgoing"
	local vscode_dir="$BACKEND_DIR/.vscode"
	if [[ ! -d $vscode_dir ]]; then
		echo "    .vscode directory not found. Creating it..."
		mkdir "$vscode_dir"
	fi

	if [[ ! -f "$vscode_dir/launch.json" ]]; then
		echo "    launch.json not found. Creating it."
		echo '{ "version": "0.2.0", "configurations": [] }' >"$vscode_dir/launch.json"
	else
		echo "    launch.json found. Backing it up before updating."
		cp "$vscode_dir/launch.json" "$vscode_dir/launch.json.bak"
	fi

	strip-json-comments <"$vscode_dir/launch.json" >"$tmp_incoming"
	gojq -L"$JQ_DIR" -s 'include "tools"; merge_confs(.[0]; .[1])' "$tmp_incoming" "$tmp_outgoing" >"$vscode_dir/launch.json"
	rm -f "$tmp_incoming" "$tmp_outgoing"
}

function restore_vscode {
	local vscode_dir="$BACKEND_DIR/.vscode"
	if [[ -f "$vscode_dir/launch.json.bak" ]]; then
		echo "Restoring original vscode launch.json..."
		mv "$vscode_dir/launch.json.bak" "$vscode_dir/launch.json"
	fi
}

function check_default_npm_globals {
	echo "Verifying required npm globals..."
	if ! command -v "strip-json-comments" 1>/dev/null; then
		echo "Installing strip-json-comments..."
		npm install -g strip-json-comments-cli
	fi
	if ! command -v "wait-on" 1>/dev/null; then
		echo "Installing wait-on..."
		npm install -g wait-on
	fi
}

function check_gstech_npm_globals {
	local global_prefix
	echo "Verifying required gstech npm globals..."
	cd "$BACKEND_DIR"
	fnm use --version-file-strategy=recursive --install-if-missing >/dev/null
	global_prefix="$(fnm exec npm prefix -g)/lib/node_modules"
	if [[ ! -d "$global_prefix/yarn" ]]; then
		echo "Installing missing gstech global: yarn"
		fnm exec npm i -g "yarn" >/dev/null
	fi
	if [[ ! -d "$global_prefix/@babel/core" ]]; then
		echo "Installing missing gstech global: @babel/core"
		fnm exec npm i -g "@babel/core" >/dev/null
	fi
	if [[ ! -d "$global_prefix/@babel/register" ]]; then
		echo "Installing missing gstech global: @babel/register"
		fnm exec npm i -g "@babel/register" >/dev/null
	fi
	if [[ ! -d "$global_prefix/wait-on" ]]; then
		echo "Installing missing gstech global: wait-on"
		fnm exec npm i -g "wait-on" >/dev/null
	fi
	cd "$PRJ_ROOT"
	fnm use default >/dev/null
}

function check_fnm {
	if ! fnm current 2>/dev/null; then
		echo "shell is not fnm-ready. Attempting to fix that..."
		echo "eval \"\$(fnm env --use-on-cd)\" # added by idfx" >>"$(get_shell_profile)"
		eval "$(fnm env --use-on-cd)"
	fi
	if [[ "$(fnm current)" = "none" ]]; then
		echo "No default node version set. Installing lts-latest"
		fnm install --lts
		fnm alias default lts-latest
	fi
}

function check_ports {
	declare -A CLIENT_PORTS=(
		["ngrok"]="$NGROK_IDFX_APP_PORT"
		["mailpit"]="$MAILPIT_IDFX_APP_PORT"
		["backoffice"]="$BO_IDFX_APP_PORT"
		["campa"]="$CAMPA_IDFX_APP_PORT"
		["luckydino"]="$LD_IDFX_APP_PORT"
		["jefe"]="$CJ_IDFX_APP_PORT"
		["justwow"]="$KK_IDFX_APP_PORT"
		["kalevala"]="$KK_IDFX_APP_PORT"
		["olaspill"]="$OS_IDFX_APP_PORT"
		["hipspin"]="$FK_IDFX_APP_PORT"
		["fiksu"]="$FK_IDFX_APP_PORT"
		["freshspins"]="$SN_IDFX_APP_PORT"
		["sportnation"]="$SN_IDFX_APP_PORT"
		["vie"]="$VB_IDFX_APP_PORT"
	)
	declare -a LISTENING_PORTS=()
	IFS=',' read -ra ports <<<"$(lsof -PiTCP -sTCP:LISTEN -n -P |
		awk '{if(NR!=1){print $1":"$9}}' |
		awk -F: '$3 ~ /^303[0-9]|3000|3300|4040|8025/{print $3}' |
		tr '\n' ',')"
	for port in "${ports[@]}"; do
		for key in "${!CLIENT_PORTS[@]}"; do
			if [ "$port" == "${CLIENT_PORTS[$key]}" ]; then
				LISTENING_PORTS+=("$key:$port")
				break
			fi
		done
	done
	echo "${LISTENING_PORTS[@]}"
}

function inject_debug_files {
	mapfile -t files < <(find "$DEBUG_FILES_DIR" -type f -name '*-dbg.js')
	for file in "${files[@]}"; do
		cp "$file" "${file/$DEBUG_FILES_DIR/$BACKEND_DIR\/packages}"
	done
}

function eject_debug_files {
	mapfile -t files < <(find "$DEBUG_FILES_DIR" -type f -name '*-dbg.js')
	files=("${files[@]//$DEBUG_FILES_DIR/$BACKEND_DIR\/packages}")
	for file in "${files[@]}"; do
		rm "$file"
	done
}

case "$1" in
"up-vscode")
	setup_vscode
	;;
"down-vscode")
	restore_vscode
	;;
"global-npm")
	check_default_npm_globals
	;;
"global-gstech")
	check_gstech_npm_globals
	;;
"fnm")
	check_fnm
	;;
"launch-prep")
	shift
	check_fnm
	if arr_contains "$@" "--no-inject"; then
		echo "Skipped debug file injection..."
	else
		inject_debug_files
	fi
	check_default_npm_globals
	setup_vscode
	check_gstech_npm_globals
	;;
"teardown")
	restore_vscode
	eject_debug_files
	relinquish_held_leases
	;;
"env")
	shift
	env_gstech "$@"
	;;
"check-ports")
	check_ports
	;;
"launch-preflight")
	check_docker_env
	;;
"check-environment")
	check_environment
	;;
"check-db")
	check_content_db
	;;
"signal-wait")
	shift
	wait_for_signal "$@"
	;;
"signal-wait-consume")
	shift
	wait_for_signal_consumption "$@"
	;;
"generic")
	shift
	"$@"
	;;
*)
	"$@"
	;;
esac
