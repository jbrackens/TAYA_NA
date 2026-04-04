#!/usr/bin/env bash
set -e

source "./globals.sh"
source "./config.sh"

function initial_setup {
	if [[ ! -d "$RESOURCE_DIR" ]]; then
		mkdir -p "$RESOURCE_DIR"
	fi
	if [[ ! -d "$TMP_DIR" ]]; then
		mkdir -p "$TMP_DIR"
	fi
	if [[ ! -d "$DATA_DIR" ]]; then
		mkdir -p "$DATA_DIR"
	fi
	if [[ ! -d "$SIGNALS_DIR" ]]; then
		mkdir -p "$SIGNALS_DIR"
	fi
	if [[ ! -d "$LOGS_DIR" ]]; then
		mkdir -p "$LOGS_DIR"
	fi
	if [[ ! -d "$PEV_DATA_DIR" ]]; then
		mkdir -p "$PEV_DATA_DIR"
	fi
	if [[ ! -d "$INTRCPTR_TMP_DIR" ]]; then
		mkdir -p "$INTRCPTR_TMP_DIR"
	fi
	if [[ ! -f "$PIDS_FILE" ]]; then
		touch "$PIDS_FILE"
	fi
	if [[ ! -f "$SQL_FILTER" ]]; then
		cp "$ASSET_DIR/filter.tmpl.sql" "$SQL_FILTER"
	fi
	if [[ ! -f "$CONFIG_FILE" ]]; then
		cp "$ASSET_DIR/config.tmpl.yml" "$CONFIG_FILE"
	fi
	if [[ ! -f "$NGROK_CONF" ]]; then
		envsubst <"$ASSET_DIR/ngrok.tmpl.yml" >"$NGROK_CONF"
	fi
	if [[ ! -f "$TRANSFORMER_YML" ]]; then
		cp "$ASSET_DIR/transformer.tmpl.yml" "$TRANSFORMER_YML"
	fi
}

function verify_local_repos {
	if [[ ! -d "$BACKEND_DIR" ]]; then
		if gum confirm "$BACKEND_DIR does not exist. Want me to clone and yarn install the repo? (required)"; then
			$IDFX_SPINNER "Setting up gstech repo" <<-EOM
				$GITOPS_DIR/main.sh pull-missing gstech "$BACKEND_DIR"
			EOM
		else
			echo "Please clone the repo and run this script again."
			exit 1
		fi
	fi
	if [[ ! -d "$BRAND_DIR" ]]; then
		if gum confirm "$BRAND_DIR does not exist. Want me to clone and yarn install the repo? (this takes like ~20minutes)"; then
			$IDFX_SPINNER "Setting up brand-client repo" <<-EOM
				$GITOPS_DIR/main.sh pull-missing brand "$BRAND_DIR"
			EOM
		else
			[[ "$1" = "launch" ]] && exit 1
		fi
	fi
	if [[ ! -d "$BO_DIR" ]]; then
		if gum confirm "$BO_DIR does not exist. Want me to clone and yarn install the repo?"; then
			$IDFX_SPINNER "Setting up backoffice repo" <<-EOM
				$GITOPS_DIR/main.sh pull-missing backoffice "$BO_DIR"
			EOM
		else
			[[ "$1" = "launch" ]] && exit 1
		fi
	fi
	if [[ ! -d "$CAMPA_CLIENT_DIR" ]]; then
		if gum confirm "$CAMPA_CLIENT_DIR does not exist. Want me to clone and yarn install the repo?"; then
			$IDFX_SPINNER "Setting up campa-client repo" <<-EOM
				$GITOPS_DIR/main.sh pull-missing campa "$CAMPA_CLIENT_DIR"
			EOM
		else
			[[ "$1" = "launch" ]] && exit 1
		fi
	fi
	# if [[ ! -d "$AFF_CLIENT_DIR" ]]; then
	# 	if gum confirm "$AFF_CLIENT_DIR does not exist. Want me to clone and yarn install the repo?"; then
	# 			$IDFX_SPINNER "Setting up affmore-client repo" <<-EOM
	# 			$GITOPS_DIR/main.sh pull-missing affmore "$AFF_CLIENT_DIR"
	# 		EOM
	# 	fi
	# fi
}

initial_setup

if [[ "$1" = "config" ]]; then
	case $2 in
	"reset")
		reset_config
		;;
	"edit")
		edit_config
		;;
	*)
		edit_config
		;;
	esac
	exit 0
fi

check_and_load_config

function clean_tmp_files {
	rm -f "$TMP_DIR"/"$SPIN_OUT_FEXT" || true
	# rm -f "$TMP_DIR"/*"$SPIN_OUT_FEXT" || true
}
trap clean_tmp_files EXIT

function cleanup_pids {
	clean_tmp_files
	local pids
	mapfile -t pids <"$PIDS_FILE"
	for ((idx = ${#pids[@]} - 1; idx >= 0; idx--)); do
		kill -15 "${pids[idx]}" >/dev/null 2>&1 || true
	done
}
trap cleanup_pids SIGINT SIGTERM

verify_local_repos "$@"
true >"$PIDS_FILE"

case $1 in
home)
	open "$RESOURCE_DIR"
	;;
tmp)
	open "$TMP_DIR"
	;;
filter)
	open "$SQL_FILTER"
	;;
transformer)
	open "$TRANSFORMER_YML"
	;;
logs)
	shift
	"$LOGGING_DIR/main.sh" "$@"
	;;
launch | env | patches* | unpatch | patch | migrate | i18n | open | running | plc)
	"$LAUNCHER_DIR/main.sh" "$@"
	;;
import)
	shift
	"$IMPORTER_DIR/main.sh" "$@"
	;;
scratch)
	shift
	"$SRC_DIR/scratch.sh" "$@" # used for debugging
	;;
ticket | workon)
	shift
	"$GITOPS_DIR/main.sh" "branch-ticket" "$@" # used for debugging
	;;
dt)
	shift
	"$INTRCPTR_DIR/main.sh" "$@"
	;;
remote)
	shift
	"$WEBOPS_DIR/main.sh" "$@"
	;;
pev)
	shift
	"$PEV_DIR/main.sh" "$@"
	;;
dev)
	shift
	"./dev.sh" "$@"
	;;
r)
	shift
	"$@"
	;;
rmtmp)
	clean_tmp_files
	;;
esac
