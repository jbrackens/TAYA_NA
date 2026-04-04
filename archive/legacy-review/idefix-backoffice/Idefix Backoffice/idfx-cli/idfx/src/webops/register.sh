#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

function exec_npm {
	fnm use lts-latest --install-if-missing >/dev/null
	local npm_cmd=("fnm" "exec" "--using=lts-latest" "npm")
	"${npm_cmd[@]}" "$@"
}

function npm_prefix {
	exec_npm prefix -g | tail -1
}

if [[ -z "$IDFX_NPMLIB" ]]; then
	IDFX_NPMLIB="$(npm_prefix)/lib/node_modules"
fi

function ensure_npm {
	local missing=()
	for lib in "$@"; do
		local libdir="$IDFX_NPMLIB/$lib"
		if [[ ! -d "$libdir" ]]; then
			missing+=("$lib")
		fi
	done
	if [[ ${#missing[@]} -gt 0 ]]; then
		log2 "Installing missing NPM libs: ${missing[*]}"
		exec_npm install -g "${missing[@]}" >/dev/null
	fi
	return 0
}

function exec_node {
	fnm use lts-latest --install-if-missing >/dev/null
	local node_cmd=("fnm" "exec" "--using=lts-latest" "node")
	local piped
	piped=$(cat)
	if [[ -n "$piped" ]]; then
		"${node_cmd[@]}" "$@" <<-EOM
			$piped
		EOM
		return $?
	fi
	"${node_cmd[@]}" "$@"
}

function generate_player {
	local override="{}"
	for arg in "$@"; do
		if [[ $arg = "--"*"="* ]]; then
			local cln o_key o_val o_tmp="$override"
			cln="${arg#--}"
			o_key="${cln%%=*}"
			o_val="${cln#*=}"
			# shellcheck disable=SC2016
			override="$(gojq -r -n --argjson i "$o_tmp" --arg k "$o_key" --arg v "$o_val" '$i+{($k): $v}')"
		elif [[ $arg = "-"*"="* ]]; then
			local cln s_key o_key o_val o_tmp="$override"
			cln="${arg#-}"
			s_key="${cln%%=*}"
			o_val="${cln#*=}"
			case "$s_key" in
			"l") o_key="languageISO" ;;
			"c") o_key="countryISO" ;;
			"cy") o_key="currencyISO" ;;
			"fn") o_key="firstName" ;;
			"ln") o_key="lastName" ;;
			"e") o_key="email" ;;
			"p") o_key="phone" ;;
			"n") o_key="name" ;;
			esac
			# shellcheck disable=SC2016
			override="$(gojq -r -n --argjson i "$o_tmp" --arg k "$o_key" --arg v "$o_val" '$i+{($k): $v}')"
		fi
	done
	ensure_npm '@faker-js/faker' 'google-libphonenumber' 'country-telephone-data'
	local player="$(
		exec_node "$WEBOPS_DIR/faker.js" "player" <<-EOM
			$override
		EOM
	)"
	echo "$player"
}

function generate_phone {
	local override="{}"
	for arg in "$@"; do
		if [[ $arg = "--"*"="* ]]; then
			local cln o_key o_val o_tmp="$override"
			cln="${arg#--}"
			o_key="${cln%%=*}"
			o_val="${cln#*=}"
			# shellcheck disable=SC2016
			override="$(gojq -r -n --argjson i "$o_tmp" --arg k "$o_key" --arg v "$o_val" '$i+{($k): $v}')"
		elif [[ $arg = "-"*"="* ]]; then
			local cln s_key o_key o_val o_tmp="$override"
			cln="${arg#-}"
			s_key="${cln%%=*}"
			o_val="${cln#*=}"
			case "$s_key" in
			"l") o_key="languageISO" ;;
			"c") o_key="countryISO" ;;
			"cy") o_key="currencyISO" ;;
			"fn") o_key="firstName" ;;
			"ln") o_key="lastName" ;;
			"e") o_key="email" ;;
			"p") o_key="phone" ;;
			"n") o_key="name" ;;
			esac
			# shellcheck disable=SC2016
			override="$(gojq -r -n --argjson i "$o_tmp" --arg k "$o_key" --arg v "$o_val" '$i+{($k): $v}')"
		fi
	done
	ensure_npm '@faker-js/faker' 'google-libphonenumber' 'country-telephone-data'
	local phone_obj="$(
		exec_node "$WEBOPS_DIR/faker.js" "phone" <<-EOM
			$override
		EOM
	)"
	local phone="$(echo "$phone_obj" | gojq -r '.number')"
	if copy_to_clipboard "$phone"; then
		printf "%s \e[90m(copied to clipboard)\e[0m\n" "$phone"
	else
		printf "%s\n" "$phone"
	fi
}

function register_player {
	local brand="$1"
	local player player_phone player_email resp dry_run
	if arr_contains "-d" "$@"; then
		dry_run="true"
	fi
	player="$(generate_player "$@")"
	player_phone="$(gojq -r '.phone | gsub("\\+";"")' <<<"$player")"
	player_email="$(gojq -r '.email' <<<"$player")"
	player_lang="$(gojq -r '.lang' <<<"$player")"
	declare -A brand_names=(
		["ld"]="luckydino"
		["cj"]="casinojefe"
		["vb"]="vie"
		["os"]="olaspill"
		["hs"]="hipspin"
		["fk"]="hipspin"
		["kk"]="justwow"
		["jw"]="justwow"
		["sn"]="freshspins"
		["fs"]="freshspins"
	)
	local brand_name="${brand_names[$brand]}"
	local brand_url="https://$brand_name.dev.eeg.viegg.net"
	local brand_api="$brand_url/api"
	printf ">>>>>\n %s" "$(echo "$player" | gojq)"
	if [[ -n "$dry_run" ]]; then return 0; fi
	resp="$(curl -s --data "$player" -H 'Content-Type: application/json' "$brand_api/activate/phone")"
	printf "\n<<<<<\n %s\n" "$(echo "$resp" | gojq)"
	local resp_stat="$(gojq -r '.ok' <<<"$resp")"
	if [[ "$resp_stat" != "true" ]]; then exit 1; fi
	local pinCode="$(
		exec_sql "$(get_conn_url "gsb")" <<-EOM
			select "pinCode"
			from player_pins
			where "mobilePhone"='$player_phone'
			and "pinType"='activate'
			order by "createAt" desc
			limit 1
		EOM
	)"
	# shellcheck disable=SC2016
	local verified_player="$(gojq -r -n --argjson i "$player" --argjson p "$pinCode" '$i+{pinCode: "\($p)"}')"
	printf ">>>>>\n %s" "$(echo "$verified_player" | gojq)"
	resp="$(curl -s --data "$verified_player" -H 'Content-Type: application/json' "$brand_api/register")"
	printf "\n<<<<<\n %s\n" "$(echo "$verified_player" | gojq)" "$(echo "$resp" | gojq)"
	local resp_stat="$(gojq -r '.ok' <<<"$resp")"
	if [[ "$resp_stat" != "true" ]]; then exit 1; fi
	local activation_status="$(
		exec_sql "$(get_conn_url "gsb")" <<-EOM
			select "activated"
			from players
			where "mobilePhone"='$player_phone' and "email"='$player_email'
			order by "createAt" desc
			limit 1
		EOM
	)"
	if [[ "$activation_status" == "true" ]]; then
		echo "Player account activated"
		exit 0
	fi
	local activation_token="$(
		exec_sql "$(get_conn_url "gsb")" <<-EOM
			select pt."token"
			from player_tokens pt
			left join players p on p.id=pt."playerId"
			where p."mobilePhone"='$player_phone' and p."email"='$player_email' and pt."type"='activation'
			order by "createAt" desc
			limit 1
		EOM
	)"
	resp="$(curl -s -X GET "$brand_url/$player_lang/activate/$activation_token")"
	printf ">>>>>\n %s\n<<<<<\n %s\n" "$activation_token" "$resp"
}
