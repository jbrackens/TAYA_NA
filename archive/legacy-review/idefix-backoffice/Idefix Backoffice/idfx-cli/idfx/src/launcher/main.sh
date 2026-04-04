#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=./task-fns.sh
source "$LAUNCHER_DIR/task-fns.sh"
# shellcheck source=./handlers.sh
source "$LAUNCHER_DIR/handlers.sh"
# shellcheck source=./signals.sh
source "$LAUNCHER_DIR/signals.sh"

function abort_launch() {
	local ret_code="$1"
	if [[ "$ret_code" = "1" ]]; then
		printf "\e[1;91m%s\e[m  %s\n" "$(printf "\u2717")" "Launch Aborted"
	else
		printf "\e[1;92m%s\e[m  %s\n" "$(printf "\u2714")" "Launch Aborted"
	fi
	exit "$ret_code"
}

# TODO: check, and abort, if another launch process is running
function do_prelaunch_checks() {
	local jid="$(date +%s)" require_pg_import="NO" env_probs=() db_action="" env_action=""
	$IDFX_SPINNER -qq -fwd -j="$jid" "Checking environment services" --warn="Missing required services: \e[0;93m%s\e[m" <<-EOM || true
		$PROGRESS_FNS check-environment
	EOM
	mapfile -t env_probs < <(spin_job_output -d "$jid")
	if [[ ${#env_probs[@]} -gt 0 ]]; then
		env_action="$(gum choose --limit=1 --header="Start missing services?" "Yes" "No")"
		case "$env_action" in
		"Yes")
			if arr_contains "postgres" "${env_probs[@]}"; then require_pg_import="YES"; fi
			$IDFX_SPINNER "Starting missing services" "Services started" "Error starting services" <<-EOM
				$PROGRESS_FNS env $(quote_arr "${env_probs[@]}")
			EOM
			;;
		"No")
			abort_launch 0
			;;
		esac
	fi
	if [[ "$require_pg_import" = "NO" ]]; then
		if ! $IDFX_SPINNER -q "Checking database content" --warn="Missing required db content data" <<-EOM; then require_pg_import="YES"; fi
			$PROGRESS_FNS check-db
		EOM
	else
		printf "\e[0;93m%s\e[m  %s\n" "$(printf "\u26A0")" "Missing required db content data"
	fi
	if [[ $require_pg_import == "YES" ]]; then
		local import_cmd=("$IDFX_" "import" "-p" "-m")
		db_action="$(gum choose --limit=1 --header="What would you like to do?" \
			"Import from cache (if possible)" "Import fresh data" "Abort launch")"
		case "$db_action" in
		"Import from cache (if possible)")
			if $IDFX_SPINNER "Checking cache" --ok="Cache valid, starting import" --warn="Cache Invalid, starting fresh data import" <<-EOM; then import_cmd+=("-c"); fi
				$IDFX_ import validate-cache
			EOM
			;;
		"Abort launch")
			abort_launch 0
			;;
		esac
		"${import_cmd[@]}"
	fi
}

function launch {
	do_prelaunch_checks
	# shellcheck disable=SC2034
	local rcvd_flags=("$@")
	# shellcheck disable=SC2034
	local prep_flag_opts=("--no-inject")
	rm -f "$SIGNALS_DIR"/* 2>/dev/null || true
	rm -f "$INTRCPTR_TMP_DIR"/* 2>/dev/null || true
	function teardown {
		$IDFX_SPINNER "Cleaning up..." <<-EOM
			$PROGRESS_FNS teardown
		EOM
		fnm use default >/dev/null 2>&1 || true
	}
	trap teardown EXIT SIGINT SIGTERM
	IFS=' ' read -ra prep_args <<<"launch-prep $(intersect_arrays prep_flag_opts[@] rcvd_flags[@])"
	IFS=' ' read -ra post_args <<<"start-all $(diff_arrays rcvd_flags[@] prep_flag_opts[@])"
	$IDFX_SPINNER "Running launch pre-flight" <<-EOM
		$PROGRESS_FNS $(quote_arr "${prep_args[@]}")
	EOM
	# shellcheck disable=SC2048 disable=SC2086
	run_mprocs ${post_args[*]}
}

[[ -z "$1" ]] && launch

case $1 in
i18n)
	import_localizations
	;;
bootstrap)
	bootstrap_gstech
	;;
env)
	shift
	handle_env_cmd "$@"
	;;
open)
	shift
	handle_open_cmd "$@"
	;;
running)
	"$PROGRESS_FNS" "check-ports"
	;;
patches*)
	if patch_gstech "$1" 2>/dev/null; then
		echo "$(tput setaf 2)>>> Applied patch.$(tput sgr0)"
	else
		echo "$(tput setaf 3)<<< Reversing patch.$(tput sgr0)"
		unpatch_gstech "$1"
	fi
	;;
unpatch)
	patch_file="$(list_patches | gum filter --limit 1)"
	if [[ -n "$patch_file" ]]; then
		unpatch_gstech "$patch_file"
		echo "$patch_file $(tput setaf 3)<<< Reversed patch$(tput sgr0)"
	fi
	;;
patch)
	patch_file="$(list_patches | gum filter --limit 1)"
	if [[ -n "$patch_file" ]]; then
		patch_gstech "$patch_file"
		echo "$patch_file $(tput setaf 2)>>> Applied patch$(tput sgr0)"
	fi
	;;
migrate)
	shift
	migrate_gstech "$@"
	;;
launch)
	shift
	launch "$@"
	;;
plc)
	do_prelaunch_checks
	;;
*)
	echo "Unknown command: $1"
	;;
esac
