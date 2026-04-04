#!/usr/bin/env bash
set -e

#shellcheck source=./register.sh
source "$WEBOPS_DIR/register.sh"


case "$1" in
"register")
	shift
	register_player "$@"
	;;
"phone")
	shift
	generate_phone "$@"
	;;
esac
