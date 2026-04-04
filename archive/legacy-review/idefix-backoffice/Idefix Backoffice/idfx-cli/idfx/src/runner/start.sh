#!/usr/bin/env bash
set -e

# shellcheck source=../launcher/signals.sh
source "$LAUNCHER_DIR/signals.sh"

export IDFX_PROC_ID
export TZ="Europe/Malta"
export LOGGER_LEVEL=debug
export LOGGER_FORMAT=nice
export MOCK_MAILER_PORT=$MAILPIT_IDFX_SMTP_PORT
IDFX_PROC_ID="$(
	IFS='.'
	echo "${*:1}"
)"

if consume_signal "launched"; then
	# shellcheck disable=SC2048 disable=SC2086
	emit_signals ${RUNNER_ARGS[*]}
fi

function free_port {
	local port="$1" pid=""
	pid="$(lsof -t -i "tcp:$port")" || true
	if [[ -n "$pid" ]]; then kill -9 "$pid"; fi
}

function dbg {
	printf "%s\n" "${@}" >>"$DBG_FILE"
}

function wait_for_key {
	local msg="$1"
	if [[ -n "$msg" ]]; then
		echo "$(tput setaf 3)$msg$(tput sgr0)"
		echo
	fi
	echo "$(tput setaf 3)Press CTRL-A to focus this terminal, then any key to start.$(tput sgr0)"
	read -n1 -s -r
}

function backend {
	export LOGGER_SERVICE="gstech-backend"
	export PORT=$GSTECH_BACKEND_IDFX_PORT
	export WALLET_PORT=$GSTECH_BACKEND_IDFX_WALLET_PORT
	local inspect="0.0.0.0:${BACKEND_DBG_PORT:-9220}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	fnm exec yarn workspace gstech-backend nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function paymentserver {
	export LOGGER_SERVICE="paymentserver"
	export PORT=$PAYMENTSERVER_IDFX_PORT
	export API_PORT=$PAYMENTSERVER_IDFX_API_PORT
	export PUBLIC_URL
	local inspect="0.0.0.0:${PAYMENT_DBG_PORT:-9222}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	wait-on -l --delay=4000 "http-get://127.0.0.1:$NGROK_IDFX_APP_PORT/api/tunnels" &&
		PUBLIC_URL=$(curl -s "http://localhost:$NGROK_IDFX_APP_PORT/api/tunnels" | gojq -L"$JQ_DIR" -r 'include "tools"; find_ngrok_url("3006")' | tr -d '\n')
	echo "PUBLIC_URL=$(tput setaf 2)$PUBLIC_URL$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	fnm exec yarn workspace gstech-paymentserver nodemon --ignore '*.quokka.*' -e js,jst,html --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function brand_backend {
	local brand="$2"
	local inspect
	export SITE_NAME
	export URL
	export DBG_BRAND
	export PORT
	case "$brand" in
	"ld")
		SITE_NAME="luckydino"
		DBG_BRAND=$LD_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$LD_IDFX_SRV_PORT
		inspect="0.0.0.0:${LD_BRAND_DBG_PORT:-9228}"
		;;
	"cj")
		SITE_NAME="jefe"
		DBG_BRAND=$CJ_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$CJ_IDFX_SRV_PORT
		inspect="0.0.0.0:${CJ_BRAND_DBG_PORT:-9227}"
		;;
	"kk")
		SITE_NAME="kalevala"
		DBG_BRAND=$KK_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$KK_IDFX_SRV_PORT
		inspect="0.0.0.0:${KK_BRAND_DBG_PORT:-9242}"
		;;
	"os")
		SITE_NAME="olaspill"
		DBG_BRAND=$OS_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$OS_IDFX_SRV_PORT
		inspect="0.0.0.0:${OS_BRAND_DBG_PORT:-9241}"
		;;
	"fk")
		SITE_NAME="fiksu"
		DBG_BRAND=$FK_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$FK_IDFX_SRV_PORT
		inspect="0.0.0.0:${FK_BRAND_DBG_PORT:-9240}"
		;;
	"sn")
		SITE_NAME="sportnation"
		DBG_BRAND=$SN_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$SN_IDFX_SRV_PORT
		inspect="0.0.0.0:${SN_BRAND_DBG_PORT:-9243}"
		;;
	"vb")
		SITE_NAME="vie"
		DBG_BRAND=$VB_IDFX_APP_PORT
		URL="http://localhost:$DBG_BRAND"
		PORT=$VB_IDFX_SRV_PORT
		inspect="0.0.0.0:${VB_BRAND_DBG_PORT:-9226}"
		;;
	esac
	export LOGGER_SERVICE="$SITE_NAME-backend"
	export DEBUG_FAKE_CNTRY
	[[ -z "$DEBUG_FAKE_IP" ]] && DEBUG_FAKE_IP="$(dig +short myip.opendns.com @resolver1.opendns.com | tr -d '\n')"
	DEBUG_FAKE_CNTRY="$(curl -s "http://ip-api.com/json/$DEBUG_FAKE_IP" | gojq -r '.countryCode' | tr -d '\n')"
	echo "DEBUG_FAKE_IP=$(tput setaf 2)$DEBUG_FAKE_IP$(tput sgr0)"
	echo "DEBUG_FAKE_CNTRY=$(tput setaf 2)$DEBUG_FAKE_CNTRY$(tput sgr0)"
	export IMPORT_REWARDS="true"
	export KAFKA_ENABLED=true
	export NODE_ENV=development
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	wait-on -l --delay=2000 "tcp:$REWARDSERVER_IDFX_PORT" && (
		emit_signal "initing"
		fnm exec yarn workspace brandserver-backend node -r ./rm-flow.js src/tools/import.js
		fnm exec yarn workspace brandserver-backend "init:$SITE_NAME"
		consume_signal "initing"
		wait_for_signal "brand-backend.*.initing" -r --delay=1000
		emit_signal "started"
		fnm exec yarn workspace brandserver-backend nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" \
			--watch src/server --watch src/worker --watch src/markdown --ext js,mjs,json,md --nolazy --exec babel-node --root-mode upward web-dbg.js
	)
}

function brand_worker {
	if consume_signal "no-worker"; then
		echo "Skipping $IDFX_PROC_ID"
		exit 0
	fi
	local brand="$2"
	local inspect
	export PORT
	export SITE_NAME
	case "$brand" in
	"ld")
		SITE_NAME="luckydino"
		PORT=$LD_IDFX_SRV_PORT
		inspect="0.0.0.0:${LD_WORKER_DBG_PORT:-9258}"
		;;
	"cj")
		SITE_NAME="jefe"
		PORT=$CJ_IDFX_SRV_PORT
		inspect="0.0.0.0:${CJ_WORKER_DBG_PORT:-9257}"
		;;
	"kk")
		SITE_NAME="kalevala"
		PORT=$KK_IDFX_SRV_PORT
		inspect="0.0.0.0:${KK_WORKER_DBG_PORT:-9252}"
		;;
	"os")
		SITE_NAME="olaspill"
		PORT=$OS_IDFX_SRV_PORT
		inspect="0.0.0.0:${OS_WORKER_DBG_PORT:-9251}"
		;;
	"fk")
		SITE_NAME="fiksu"
		PORT=$FK_IDFX_SRV_PORT
		inspect="0.0.0.0:${LD_WORKER_DBG_PORT:-9250}"
		;;
	"sn")
		SITE_NAME="sportnation"
		PORT=$SN_IDFX_SRV_PORT
		inspect="0.0.0.0:${SN_WORKER_DBG_PORT:-9253}"
		;;
	"vb")
		SITE_NAME="vie"
		PORT=$VB_IDFX_SRV_PORT
		inspect="0.0.0.0:${LD_WORKER_DBG_PORT:-9256}"
		;;
	esac
	export LOGGER_SERVICE="$SITE_NAME-worker"
	export NODE_ENV=development
	export LD_ENV=worker
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	wait_for_signal "brand-backend.$brand.started" &&
		fnm exec yarn workspace brandserver-backend nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" --watch src/worker --watch cron --nolazy --exec babel-node --root-mode upward web-dbg.js
}

function backend_worker {
	# echo "$(tput setaf 3)To preserve resources, backend_worker is not auto-started.$(tput sgr0)"
	# echo "$(tput setaf 3)    Press CTRL-A to focus this terminal, then any key to start.$(tput sgr0)"
	# read -n1 -s -r
	export LOGGER_SERVICE="gstech-worker"
	export KAFKA_ENABLED=true
	export notifications_LD="http://localhost:$LD_IDFX_SRV_PORT"
	export notifications_CJ="http://localhost:$CJ_IDFX_SRV_PORT"
	export notifications_KK="http://localhost:$KK_IDFX_SRV_PORT"
	export notifications_OS="http://localhost:$OS_IDFX_SRV_PORT"
	export notifications_FK="http://localhost:$FK_IDFX_SRV_PORT"
	export notifications_SN="http://localhost:$SN_IDFX_SRV_PORT"
	export notifications_VB="http://localhost:$VB_IDFX_SRV_PORT"
	local inspect="0.0.0.0:${BACKEND_WORKER_DBG_PORT:-9221}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	fnm exec yarn workspace gstech-backend nodemon --inspect="$inspect" --ignore '*.quokka.*' --nolazy --exec babel-node --root-mode upward worker-dbg.js
}

function backend_cron {
	export LOGGER_SERVICE="gstech-reporting"
	wait_for_key "To preserve resources, backend_cronjob is not auto-started."
	local inspect="0.0.0.0:${BACKEND_CRON_DBG_PORT:-9219}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	fnm exec yarn workspace gstech-backend nodemon --inspect="$inspect" --ignore '*.quokka.*' --nolazy --exec babel-node --root-mode upward crontab-dbg.js
}

function walletserver {
	export LOGGER_SERVICE="walletserver"
	export PORT=$WALLETSERVER_IDFX_PORT
	export API_PORT=$WALLETSERVER_IDFX_API_PORT
	local inspect="0.0.0.0:${WALLET_DBG_PORT:-9224}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	fnm exec yarn workspace gstech-walletserver nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function campainserver {
	export LOGGER_SERVICE="campaignserver"
	export PORT=$CAMPAIGNSERVER_IDFX_PORT
	export CAMPAIGN_SERVER_PRIVATE_PORT=$CAMPAIGNSERVER_IDFX_PRIV_PORT
	export KAFKA_ENABLED=true
	local inspect="0.0.0.0:${CAMPAIGN_DBG_PORT:-9213}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	fnm exec yarn workspace gstech-campaignserver nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function rewardserver {
	export LOGGER_SERVICE="rewardserver"
	export PORT=$REWARDSERVER_IDFX_PORT
	export REWARD_SERVER_MANAGEMENT_PORT=$REWARDSERVER_IDFX_MGMT_PORT
	export KAFKA_ENABLED=true
	local inspect="0.0.0.0:${REWARD_DBG_PORT:-9212}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	free_port "$PORT"
	wait-on -l --delay=2000 "tcp:$CAMPAIGNSERVER_IDFX_PORT" &&
		fnm exec yarn workspace gstech-rewardserver nodemon --ignore '*.quokka.*' --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function affmore {
	export LOGGER_SERVICE="affmore-backend"
	export POSTGRES_PORT=5433
	local inspect="0.0.0.0:${AFFMORE_DBG_PORT:-9218}"
	echo "DEBUGGER_PORT=$(tput setaf 2)${inspect##*:}$(tput sgr0)"
	cd "$BACKEND_DIR"
	fnm exec yarn workspace affmore-backend nodemon --delay 2.5 --inspect="$inspect" --nolazy --exec babel-node --root-mode upward index-dbg.js
}

function compliance {
	export LOGGER_SERVICE="complianceserver"
	export PORT=$COMPLIANCESERVER_IDFX_PORT
	cd "$BACKEND_DIR"
	free_port "$PORT"
	fnm exec yarn workspace gstech-compliance serve
}

function brand_client {
	local brand="$2"
	local project
	if consume_signal "no-client"; then
		echo "Skipping $IDFX_PROC_ID"
		exit 0
	fi
	export DBG="TRUE"
	export PORT
	export API
	export CAPTCHA_SITE_KEY
	case "$brand" in
	"ld")
		project="luckydino"
		PORT=$LD_IDFX_APP_PORT
		API="http://localhost:$LD_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6Lc73VUlAAAAANEiKFP0FnP6Q0snYIVlLlaQtghX"
		;;
	"cj")
		project="jefe"
		PORT=$CJ_IDFX_APP_PORT
		API="http://localhost:$CJ_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6Le1TlclAAAAABXk01N2E59qE1QQy5w7Y5m-KkWc"
		;;
	"kk")
		project="kalevala"
		PORT=$KK_IDFX_APP_PORT
		API="http://localhost:$KK_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6LceU1clAAAAABoM_YhnXjOlPMANc-H8AXAFnN5L"
		;;
	"os")
		project="olaspill"
		PORT=$OS_IDFX_APP_PORT
		API="http://localhost:$OS_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6LcfVVclAAAAALRtvgN0zTzKDg4O8bBkw8DQsTfF"
		;;
	"fk")
		project="fiksu"
		PORT=$FK_IDFX_APP_PORT
		API="http://localhost:$FK_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6LcWTVclAAAAAM4WZZQeYiucebL1ZbWs3aoar_UF"
		;;
	"sn")
		project="sportnation"
		PORT=$SN_IDFX_APP_PORT
		API="http://localhost:$SN_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6LeJVVclAAAAAC2j-iosA3qiJ0kf0E0pT1qhfTwG"
		;;
	"vb")
		project="vie"
		PORT=$VB_IDFX_APP_PORT
		API="http://localhost:$VB_IDFX_SRV_PORT/"
		CAPTCHA_SITE_KEY="6LfDVlclAAAAABWgiFIo3AwEG00yjQz9XTWYIZNR"
		;;
	esac
	cd "$BRAND_DIR"
	free_port "$PORT"
	wait_for_signal "brand-backend.$brand.started" &&
		(
			fnm exec command -v yarn || fnm exec npm i -g yarn
			if peek_signal "debug-client"; then
				if ! fnm exec yarn "debug:$project"; then
					echo "$(tput setaf 1)Failed to run $project nx debug config, falling back to nx local config$(tput sgr0)"
					fnm exec yarn nx serve "$project" --port="$PORT"
				fi
			else
				fnm exec yarn nx serve "$project" --port="$PORT"
			fi
		)
}

function backoffice {
	export BROWSER=none
	export PORT=$BO_IDFX_APP_PORT
	cd "$BO_DIR"
	fnm exec command -v yarn || fnm exec npm i -g yarn
	free_port "$PORT"
	fnm exec yarn start
}

function affmore_client {
	export PORT=3008
	cd "$AFF_CLIENT_DIR"
	fnm exec command -v yarn || fnm exec npm i -g yarn
	free_port "$PORT"
	fnm exec yarn start:local
}

function campa_client {
	export PORT=$CAMPA_IDFX_APP_PORT
	export BROWSER=none
	export CAMPAIGNSERVER_URL="http://localhost:$CAMPAIGNSERVER_IDFX_PORT"
	cd "$CAMPA_CLIENT_DIR"
	free_port "$PORT"
	wait-on -l --delay=2000 "tcp:$CAMPAIGNSERVER_IDFX_PORT" && (
		fnm exec command -v yarn || fnm exec npm i -g yarn
		fnm exec yarn start:local
	)
}

function tunnel {
	if ! ngrok start walletserver paymentserver; then
		if ! ngrok --config "$NGROK_CONF" start paymentserver walletserver; then
			ngrok http --region=eu --scheme=https "$PAYMENTSERVER_IDFX_PORT"
		fi
	fi
}

function interceptor {
	local jid="$(date +%s)" refresh_ts="" setup_result=""
	IFS=' ' read -ra intercepts <<<"$(read_signal_group "interceptor.*")"
	if $IDFX_SPINNER "Setting up Interceptor" "Interceptor setup complete" "Interceptor setup failed" <<-EOM; then setup_result="success"; fi
		$IDFX_ dt init $(quote_arr "${intercepts[@]}") -- Initializing modules
		wait-on -l --timeout=10000 --delay=1000 "http-get://127.0.0.1:$NGROK_IDFX_APP_PORT/api/tunnels" -- Verifying ngrok availability
		$IDFX_ dt puts $(quote_arr "${intercepts[@]}") -- Obtaining leases
	EOM
	if [[ "$setup_result" != "success" ]]; then return 1; fi
	$IDFX_SPINNER -j="$jid" "Preparing Monitor" <<-EOM && refresh_ts="$(spin_job_output -d "$jid")"
		$IDFX_ dt hydrate
	EOM
	if [[ -n "$refresh_ts" ]]; then
		wait_for_signal_consumption "interceptor.hydrated" >/dev/null &&
			$IDFX_ dt monitor -i=30 -ts="$refresh_ts"
	fi
}

function smtp {
	mailpit \
		--listen="0.0.0.0:$MAILPIT_IDFX_APP_PORT" \
		--smtp="0.0.0.0:$MAILPIT_IDFX_SMTP_PORT" \
		--db-file="$RESOURCE_DIR/mailpit.db"
}

function post {
	if consume_signal "skip-scaffold"; then
		echo "Skipping Scaffolding"
		exit 0
	fi
	cd "$BACKEND_DIR"
	shell2http -export-all-vars -port=4334 -add-exit -no-index -form -cgi -show-errors -shell="zsh" /scaffold 'fnm exec yarn workspace gstech-backend flow-node ./scaffold-dbg.js'
	echo "$(tput setaf 2)POST job finished.$(tput sgr0)"
}

function testfn {
	local last_state_file="$INTRCPTR_TMP_DIR/last_state.txt"
	local last_state="$(cat "$last_state_file")"
	clear
	echo -e "$last_state"
}

case "$1" in
backend)
	backend
	;;
paymentserver)
	paymentserver
	;;
brand-backend)
	brand_backend "$@"
	;;
brand-worker)
	brand_worker "$@"
	;;
backend-worker)
	backend_worker
	;;
backend-cron)
	backend_cron
	;;
walletserver)
	walletserver
	;;
campaignserver)
	campainserver
	;;
rewardserver)
	rewardserver
	;;
compliance)
	compliance
	;;
brand-client)
	brand_client "$@"
	;;
campa-client)
	campa_client
	;;
backoffice)
	backoffice
	;;
tunnel)
	tunnel
	;;
interceptor)
	function on_exit {
		if ! peek_signal "running"; then return; fi
		if consume_signal "relinquished"; then return; fi
		consume_signal "running"
		clear
		printf "\n\n%s" "$(cat "$INTRCPTR_LAST_STATE")"
		emit_signal "stop"
		tput cup 0 0 && tput el && tput cup 0 0
		$IDFX_SPINNER "Relinquishing leases" <<-EOM
			$PROGRESS_FNS signal-wait "interceptor.stopped" -- Stopping interceptor
			$IDFX_ dt relinquish
		EOM
		consume_signal "stop"
		printf "\e[0;94m\u2139  Restart interceptor to re-acquire leases.\n"
		emit_signal "relinquished"
		exit 0
	}
	trap on_exit SIGTERM SIGINT EXIT
	consume_signals "stop" "stopped" "relinquished" || true
	interceptor
	;;
smtp)
	smtp
	;;
post)
	post
	;;
test)
	testfn
	;;
esac
