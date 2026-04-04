#!/usr/bin/env bash
set -e

# shellcheck source=src/utils.sh
source "$SRC_DIR/utils.sh"

function reset_config {
	if [[ "$1" = "-y" ]]; then
		cp "$ASSET_DIR/config.tmpl.yml" "$CONFIG_FILE"
	elif gum confirm "Are you sure?" --default="no"; then
		cp "$ASSET_DIR/config.tmpl.yml" "$CONFIG_FILE"
	fi
}

function update_config_shape {
	yq eval-all -i --header-preprocess=false \
		'select(fileIndex == 1) * select(fileIndex == 0)' \
		"$CONFIG_FILE" "$ASSET_DIR/config.tmpl.yml"
}

function edit_config {
	if [[ ! -f "$CONFIG_FILE" ]]; then reset_config "-y"; fi
	open "$CONFIG_FILE"
}

function check_and_load_config {
	if [[ ! -f "$CONFIG_FILE" ]]; then
		echo "Config file not found. Creating one..."
		reset_config "-y"
	else
		update_config_shape
	fi

	declare -A CONFIG_VARS=(
		["GSTECH_PG_USER"]="database.gstech.user"
		["GSTECH_PG_HOST"]="database.gstech.host"
		["GSTECH_PG_PASSWD"]="database.gstech.passwd"
		["CAMPAIGNSERVER_PG_USER"]="database.campaignserver.user"
		["CAMPAIGNSERVER_PG_HOST"]="database.campaignserver.host"
		["CAMPAIGNSERVER_PG_PASSWD"]="database.campaignserver.passwd"
		["REWARDSERVER_PG_USER"]="database.rewardserver.user"
		["REWARDSERVER_PG_HOST"]="database.rewardserver.host"
		["REWARDSERVER_PG_PASSWD"]="database.rewardserver.passwd"
		["GSTECH_BETA_PG_USER"]="database.gstech_beta.user"
		["GSTECH_BETA_PG_HOST"]="database.gstech_beta.host"
		["GSTECH_BETA_PG_PASSWD"]="database.gstech_beta.passwd"
		["KV_AUTH_KEY"]="devtools_interceptor.api_key"
		["BACKEND_DIR"]="repositories.backend_dir"
		["BRAND_DIR"]="repositories.brand_dir"
		["BO_DIR"]="repositories.backoffice_dir"
		["AFF_CLIENT_DIR"]="repositories.affmore_client_dir"
		["CAMPA_CLIENT_DIR"]="repositories.campa_client_dir"
		["DEBUG_FAKE_IP"]="mock.fake_ip"
		["IDEFIX_USER"]="mock.idefix_user"
		["IDFX_LOGS_LIMIT"]="logs.size_limit"
		["BACKEND_DBG_PORT"]="debugger_ports.backend"
		["BACKEND_CRON_DBG_PORT"]="debugger_ports.backend_cron"
		["BACKEND_WORKER_DBG_PORT"]="debugger_ports.backend_worker"
		["AFFMORE_DBG_PORT"]="debugger_ports.affmore"
		["PAYMENT_DBG_PORT"]="debugger_ports.payment"
		["WALLET_DBG_PORT"]="debugger_ports.wallet"
		["CAMPAIGN_DBG_PORT"]="debugger_ports.campaign"
		["REWARD_DBG_PORT"]="debugger_ports.reward"
		["LD_BRAND_DBG_PORT"]="debugger_ports.ld_brand"
		["CJ_BRAND_DBG_PORT"]="debugger_ports.cj_brand"
		["VB_BRAND_DBG_PORT"]="debugger_ports.vb_brand"
		["FK_BRAND_DBG_PORT"]="debugger_ports.fk_brand"
		["OS_BRAND_DBG_PORT"]="debugger_ports.os_brand"
		["KK_BRAND_DBG_PORT"]="debugger_ports.kk_brand"
		["SN_BRAND_DBG_PORT"]="debugger_ports.sn_brand"
		["LD_WORKER_DBG_PORT"]="debugger_ports.ld_worker"
		["CJ_WORKER_DBG_PORT"]="debugger_ports.cj_worker"
		["VB_WORKER_DBG_PORT"]="debugger_ports.vb_worker"
		["FK_WORKER_DBG_PORT"]="debugger_ports.fk_worker"
		["OS_WORKER_DBG_PORT"]="debugger_ports.os_worker"
		["KK_WORKER_DBG_PORT"]="debugger_ports.kk_worker"
		["SN_WORKER_DBG_PORT"]="debugger_ports.sn_worker"
	)

	unset missing_vars
	declare -A missing_vars
	for var in "${!CONFIG_VARS[@]}"; do
		local path
		local value
		path=${CONFIG_VARS[$var]}
		value=$(yq e ".$path" "$CONFIG_FILE")
		if [[ -z "$value" ]]; then
			missing_vars["$path"]=$var
		else
			eval export "$var"='$value'
		fi
	done

	declare -A placeholders=(
		["database.gstech.user"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["database.gstech.host"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["database.gstech.passwd"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["database.campaignserver.user"]="1password -> eeg-development (or Team) vault -> Campaignserver Production Replica [RO]"
		["database.campaignserver.host"]="1password -> eeg-development (or Team) vault -> Campaignserver Production Replica [RO]"
		["database.campaignserver.passwd"]="1password -> eeg-development (or Team) vault -> Campaignserver Production Replica [RO]"
		["database.rewardserver.user"]="1password -> eeg-development (or Team) vault -> Rewardserver Production Replica [RO]"
		["database.rewardserver.host"]="1password -> eeg-development (or Team) vault -> Rewardserver Production Replica [RO]"
		["database.rewardserver.passwd"]="1password -> eeg-development (or Team) vault -> Rewardserver Production Replica [RO]"
		["database.gstech_beta.user"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["database.gstech_beta.host"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["database.gstech_beta.passwd"]="1password -> eeg-development (or Team) vault -> Gstech Production Replica [RO]"
		["devtools_interceptor.api_key"]="1password -> eeg-development (or Team) vault -> Devtools Interceptor API Key"
		["repositories.backend_dir"]="ABSOLUTE path to gstech repo (/<...>/gstech)"
		["repositories.brand_dir"]="ABSOLUTE path to brandserver-client repo (/<...>/brandserver-client)"
		["repositories.backoffice_dir"]="ABSOLUTE path to idefix-backoffice repo (/<...>/gstech-backoffice)"
		["repositories.affmore_client_dir"]="ABSOLUTE path to affmore-client repo (/<...>/affmore-client)"
		["repositories.campa_client_dir"]="ABSOLUTE path to campa-client repo (/<...>/gstech-campaignserver-client)"
		["mock.fake_ip"]="What's your IP?"
		["mock.idefix_user"]="Email to login to the backoffice locally"
		["logs.size_limit"]="How much local logs to keep accessible before showing archival options? (eg. 0.5G)"
		["debugger_ports.backend"]="node-inspector debugger port for backend"
		["debugger_ports.backend_cron"]="node-inspector debugger port for backend_cron"
		["debugger_ports.backend_worker"]="node-inspector debugger port for backend_worker"
		["debugger_ports.affmore"]="node-inspector debugger port for affmore-backend"
		["debugger_ports.payment"]="node-inspector debugger port for paymentserver"
		["debugger_ports.wallet"]="node-inspector debugger port for walletserver"
		["debugger_ports.campaign"]="node-inspector debugger port for campaignserver"
		["debugger_ports.reward"]="node-inspector debugger port for rewardserver"
		["debugger_ports.ld_brand"]="node-inspector debugger port for LuckyDino brandserver-backend"
		["debugger_ports.cj_brand"]="node-inspector debugger port for CasinoJefe brandserver-backend"
		["debugger_ports.vb_brand"]="node-inspector debugger port for Vie.bet brandserver-backend"
		["debugger_ports.fk_brand"]="node-inspector debugger port for HipSpin brandserver-backend"
		["debugger_ports.os_brand"]="node-inspector debugger port for OlaSpill brandserver-backend"
		["debugger_ports.kk_brand"]="node-inspector debugger port for JustWOW brandserver-backend"
		["debugger_ports.sn_brand"]="node-inspector debugger port for FreshSpins brandserver-backend"
		["debugger_ports.ld_worker"]="node-inspector debugger port for LuckyDino brandserver-worker"
		["debugger_ports.cj_worker"]="node-inspector debugger port for CasinoJefe brandserver-worker"
		["debugger_ports.vb_worker"]="node-inspector debugger port for Vie.bet brandserver-worker"
		["debugger_ports.fk_worker"]="node-inspector debugger port for HipSpin brandserver-worker"
		["debugger_ports.os_worker"]="node-inspector debugger port for OlaSpill brandserver-worker"
		["debugger_ports.kk_worker"]="node-inspector debugger port for JustWOW brandserver-worker"
		["debugger_ports.sn_worker"]="node-inspector debugger port for FreshSpins brandserver-worker"
	)

	declare -A initial_vals=(
		["database.gstech.user"]="dev_ro"
		["database.gstech.host"]="10.27.10.20"
		["database.campaignserver.user"]="campaignserver_ro"
		["database.campaignserver.host"]="luckydino-prod-campaignserver-readreplica-rds.cloxx4gelzda.eu-west-1.rds.amazonaws.com"
		["database.rewardserver.user"]="rewardserver_ro"
		["database.rewardserver.host"]="luckydino-prod-rewardserver-rds-rollback-2023-01-17.cloxx4gelzda.eu-west-1.rds.amazonaws.com"
		["database.gstech_beta.user"]="dev_rw"
		["database.gstech_beta.host"]="10.24.10.10"
		["mock.fake_ip"]="$(dig +short myip.opendns.com @resolver1.opendns.com | tr -d '\n')"
		["repositories.brand_dir"]="$(dirname "$BACKEND_DIR")/brandserver-client"
		["repositories.backoffice_dir"]="$(dirname "$BACKEND_DIR")/gstech-backoffice"
		["repositories.affmore_client_dir"]="$(dirname "$BACKEND_DIR")/affmore-client"
		["repositories.campa_client_dir"]="$(dirname "$BACKEND_DIR")/gstech-campaignserver-client"
		["mock.idefix_user"]="idfx.local@eeg.tech"
		["logs.size_limit"]="0.5G"
		["debugger_ports.backend"]="9220"
		["debugger_ports.backend_cron"]="9219"
		["debugger_ports.backend_worker"]="9221"
		["debugger_ports.affmore"]="9218"
		["debugger_ports.payment"]="9222"
		["debugger_ports.wallet"]="9224"
		["debugger_ports.campaign"]="9213"
		["debugger_ports.reward"]="9212"
		["debugger_ports.ld_brand"]="9228"
		["debugger_ports.cj_brand"]="9227"
		["debugger_ports.vb_brand"]="9226"
		["debugger_ports.fk_brand"]="9240"
		["debugger_ports.os_brand"]="9241"
		["debugger_ports.kk_brand"]="9242"
		["debugger_ports.sn_brand"]="9243"
		["debugger_ports.ld_worker"]="9258"
		["debugger_ports.cj_worker"]="9257"
		["debugger_ports.vb_worker"]="9256"
		["debugger_ports.fk_worker"]="9250"
		["debugger_ports.os_worker"]="9251"
		["debugger_ports.kk_worker"]="9252"
		["debugger_ports.sn_worker"]="9253"
	)

	ordered_keys=(
		"database.gstech.user"
		"database.gstech.host"
		"database.gstech.passwd"
		"database.campaignserver.user"
		"database.campaignserver.host"
		"database.campaignserver.passwd"
		"database.rewardserver.user"
		"database.rewardserver.host"
		"database.rewardserver.passwd"
		"database.gstech_beta.user"
		"database.gstech_beta.host"
		"database.gstech_beta.passwd"
		"devtools_interceptor.api_key"
		"repositories.backend_dir"
		"repositories.brand_dir"
		"repositories.backoffice_dir"
		"repositories.affmore_client_dir"
		"repositories.campa_client_dir"
		"mock.fake_ip"
		"mock.idefix_user"
		"logs.size_limit"
		"debugger_ports.backend"
		"debugger_ports.backend_cron"
		"debugger_ports.backend_worker"
		"debugger_ports.affmore"
		"debugger_ports.payment"
		"debugger_ports.wallet"
		"debugger_ports.campaign"
		"debugger_ports.reward"
		"debugger_ports.ld_brand"
		"debugger_ports.cj_brand"
		"debugger_ports.vb_brand"
		"debugger_ports.fk_brand"
		"debugger_ports.os_brand"
		"debugger_ports.kk_brand"
		"debugger_ports.sn_brand"
		"debugger_ports.ld_worker"
		"debugger_ports.cj_worker"
		"debugger_ports.vb_worker"
		"debugger_ports.fk_worker"
		"debugger_ports.os_worker"
		"debugger_ports.kk_worker"
		"debugger_ports.sn_worker"
	)

	if [ ${#missing_vars[@]} -ne 0 ]; then
		echo "$(tput setaf 2)Let's finish setting up your config file...$(tput sgr0) (.exit to quit)"
		for key in "${ordered_keys[@]}"; do
			[[ -z "${missing_vars[$key]}" ]] && continue
			local new_val
			while true; do
				local gum_cmd=(
					"gum input"
					"--placeholder \"${placeholders[$key]}\""
					"--prompt \"$key > \""
				)
				[[ $key = *passwd || $key = *api_key ]] && gum_cmd+=("--password")
				[[ -n "${initial_vals[$key]}" ]] && gum_cmd+=("--value=\"${initial_vals[$key]}\"")
				new_val=$(eval "${gum_cmd[*]}" | sed -e "s/^ *//;s/ *$//;s/^['\"]//;s/['\"]$//")
				if [[ $new_val = ".exit" ]]; then
					echo "exited (changes saved)"
					exit 0
				fi
				[[ -n "$new_val" ]] && break
			done
			yq e ."$key"=\""$new_val"\" -i "$CONFIG_FILE"
			eval export "${missing_vars[$key]}"='$new_val'
			if [[ $key = *passwd || $key = *api_key ]]; then
				echo "$(tput setaf 2)$(tput bold)✓$(tput sgr0) $key = $(tput bold)$(obfuscate "$new_val")$(tput sgr0)"
			else
				echo "$(tput setaf 2)$(tput bold)✓$(tput sgr0) $key = $new_val"
			fi
		done
	fi
}
