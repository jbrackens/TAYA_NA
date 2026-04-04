#!/usr/bin/env bash
set -e

function get_repo_info {
	local repo_dir
	local repo_url
	case "$1" in
	gstech)
		repo_dir="$BACKEND_DIR"
		repo_url="https://github.com/flipadmin/gstech"
		;;
	brand)
		repo_dir="$BRAND_DIR"
		repo_url="https://github.com/flipadmin/brandserver-client"
		;;
	backoffice)
		repo_dir="$BO_DIR"
		repo_url="https://github.com/flipadmin/gstech-backoffice"
		;;
	affmore)
		repo_dir="$AFF_CLIENT_DIR"
		repo_url="https://github.com/flipadmin/affmore-client"
		;;
	campa)
		repo_dir="$CAMPA_CLIENT_DIR"
		repo_url="https://github.com/flipadmin/gstech-campaignserver-client"
	esac
	printf "%s\n%s\n" "$repo_dir" "$repo_url"
}

function make_release {
	git fetch --tags
	NEW_V="$(gh release list --limit 1 | awk '{print $1}' | awk -Fv '/[0-9]+/{print "v"$NF+1}')"
	echo "gh release create $NEW_V --generate-notes"
}

function do_release {
	local repo_dir
	case "$1" in
	gstech)
		repo_dir="$BACKEND_DIR"
		;;
	brand)
		repo_dir="$BRAND_DIR"
		;;
	idefix)
		repo_dir="$BO_DIR"
		;;
	*)
		echo "Unknown release type: $2"
		echo "Valid options are <gstech|brand|idefix>"
		exit 1
		;;
	esac
	(cd "$repo_dir" && make_release)
}

function pull_repo_if_missing {
	local repo_dir repo_url
	mapfile -t repo_info < <(get_repo_info "$1")
	repo_dir="${repo_info[0]}"
	repo_url="${repo_info[1]}"
	if [[ ! -d "$repo_dir" ]]; then
		git clone "$repo_url" "$repo_dir"
		cd "$repo_dir" || exit
		fnm use --version-file-strategy=recursive --install-if-missing >/dev/null
		global_prefix="$(fnm exec npm prefix -g)/lib/node_modules"
		if [[ ! -d "$global_prefix/yarn" ]]; then
			echo "Installing missing gstech global: yarn"
			fnm exec npm i -g "yarn" >/dev/null
		fi
		fnm exec yarn install >/dev/null
		[[ "$1" = "gstech" ]] && fnm exec yarn bootstrap >/dev/null
		[[ "$1" = "brand" ]] && fnm exec yarn build:all >/dev/null
		cd "$PRJ_ROOT" || exit
	fi
}

function branch_ticket {
	local ticket_num="${1##IDXD-}"
	local type="${2:-feature}"
	local ticket_title
	if [[ -z "$3" ]]; then
		ticket_title="$(jira issue list --plain --columns key,summary --no-headers |
			awk -F'\t' -v tkt="$ticket_num" '$1 == "IDXD-"tkt {print $2}')"
	else
		ticket_title="$3"
	fi
	local title_clean
	title_clean="$(echo "$ticket_title" | sed "s/ /-/g" | sed "s/[^a-zA-Z0-9-]//g")"
	echo "$type/IDXD-$ticket_num-${title_clean:0:55}"
}

case "$1" in
release)
	shift
	do_release "$@"
	;;
pull-missing)
	shift
	pull_repo_if_missing "$@"
	;;
branch-ticket)
	shift
	branch_ticket "$@"
	;;
esac
