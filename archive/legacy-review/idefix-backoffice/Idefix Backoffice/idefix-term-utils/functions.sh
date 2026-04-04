#!/usr/bin/env zsh

# Helper function that check for required binaries
check_binaries() {
	local missing_binaries=()
	for binary in "$@"; do
		if ! command -v "$binary" >/dev/null; then
			missing_binaries+=("$binary")
		fi
	done

	if [ ${#missing_binaries[@]} -ne 0 ]; then
		echo "The following binaries are required but not installed: ${missing_binaries[*]}" >&2
		return 1
	fi
}

# creates a new release with auto-incremented version number and release notes
# Requires: gh
# Usage: (ideally master branch is checked-out) $(gsrelease)
function gsrelease {
	# ! [[ $(check_binaries "gh") ]] && return 1
	git fetch --tags
	NEW_V="$(gh release list --limit 1 | awk '{print $1}' | awk -Fv '/[0-9]+/{print "v"$NF+1}')"
	echo "gh release create $NEW_V --generate-notes"
}

# pipes log streams from different kube services into lnav
# Requires: lnav, stern, aws-vault (AWS/kubectl configured)
# Usage: knav dev-gstech-backend dev-luckydino-backend ...
# must be run from within an aws-vault authenticated shell
function knav() {
	# ! [[ $(check_binaries "lnav" "stern" "kubectl" "aws-vault") ]] && return 1
	[[ -z "$AWS_VAULT" ]] && echo "Must be run from within an aws-vault authenticated shell" && return 1
	local result=""
	for param in "$@"; do
		if [ -z "$result" ]; then
			result="$param"
		else
			result="$result|$param"
		fi
	done

	lnav <(stern "($result)" -o raw --tail 10 --color never -i "^{" 2>/dev/null)
}

# stern is great for tailing live logs, but cannot be used for date ranges in the past
# this function uses `logcli` tool to query loki for logs and pipe them into lnav
# Requires: lnav, logcli, ruby, chronic (gem install --user-install chronic)
# Usage: lokinav [options] [prod|dev] <container-fuzzy-matches...>
# Example: lokinav walletserver luckydino (default: prod)
# Example: lokinav dev walletserver luckydino
# NB. fuzzy matching args are transformed into regex: .*walletserver.*|.*luckydino.*
# NB. options are forwarded to logcli: from, to, since, limit
# NB. ruby+chronic is used to parse human-readable date strings into loki-compatible format:
#	--from="3 days ago" --to="1 day ago"
# refer to https://github.com/mojombo/chronic#examples for more examples
function lokinav() {
	# ! [[ $(check_binaries "logcli" "lnav") ]] && return 1

	local -A named_params=()
	local env=""
	local args=()

	# Parse named parameters
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
		*)
			args+=("$1")
			shift
			;;
		esac
	done

	# Set environment based on first positional argument if not specified
	if [ -z "$env" ] && [ "${args[1]}" = "dev" ]; then
		env="dev"
		args=("${args[@]:1}") # Remove first positional argument
	elif [ -z "$env" ] && [ "${args[1]}" = "prod" ]; then
		env="prod"
		args=("${args[@]:1}") # Remove first positional argument
	else
		env="prod"
	fi

	# Process positional parameters
	local result=""
	for ((i = 1; i <= ${#args[@]}; i++)); do
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
		# Check if the input argument is in the correct format
		if date -d "$from" +"%Y-%m-%dT%H:%M:%SZ" &>/dev/null; then
			# The input argument is in the correct format, so output it as is
			from="$from"
		else
			# ! [[ $(check_binaries "ruby") ]] && return 1
			# The input argument is not in the correct format, so try to parse it using Chronic
			datetime=$(echo "$from" | ruby -rchronic -e 'puts Chronic.parse(ARGF.read).utc.strftime("%Y-%m-%dT%H:%M:%SZ")')
			from="$datetime"
		fi
	fi

	if [ "${named_params["to"]+isset}" = "isset" ]; then
		to="${named_params["to"]}"
		# Check if the input argument is in the correct format
		if date -d "$to" +"%Y-%m-%dT%H:%M:%SZ" &>/dev/null; then
			# The input argument is in the correct format, so output it as is
			to="$to"
		else
			# ! [[ $(check_binaries "ruby") ]] && return 1
			# The input argument is not in the correct format, so try to parse it using Chronic
			datetime=$(echo "$to" | ruby -rchronic -e 'puts Chronic.parse(ARGF.read).utc.strftime("%Y-%m-%dT%H:%M:%SZ")')
			to="$datetime"
		fi
	fi

	local query
	local containers_arg=$(if [ -n "$result" ]; then echo "{container=~\`$result\`} | "; fi)
	query=$(
		cat <<-EOM
			$(echo $containers_arg)json | line_format \`{{.log}}\` | json | level =~ \`(${lvls:-"err|warn|info|debug"})\`
		EOM
	)
	local cmd
	local from_arg=$(if [ -n "$from" ]; then echo " --from=\"$from\""; fi)
	local to_arg=$(if [ -n "$to" ]; then echo " --to=\"$to\""; fi)
	local since_arg=$(if [ "${named_params["since"]+isset}" = "isset" ]; then echo " --since=${named_params["since"]}"; fi)
	local limit_arg=" --limit=$(if [ "${named_params["limit"]+isset}" = "isset" ]; then echo "${named_params["limit"]}"; else echo "30"; fi)"
	local batch_arg=" --batch=$(if [ "${named_params["limit"]+isset}" = "isset" ]; then echo "${named_params["batch"]}"; else echo "1000"; fi)"
	cmd=$(
		cat <<-EOF
			logcli query --quiet --output=raw $(if [ -z "$to" ]; then echo "--tail "; fi)--addr="https://loki.$env.eeg.viegg.net"$from_arg$to_arg$since_arg$limit_arg '$query' $(if [ -n "$to" ]; then echo "| jq -Msrc 'reverse | .[]'"; fi)
		EOF
	)
	echo "$cmd"
	lnav <(eval "$cmd" 2>/dev/null)
}
