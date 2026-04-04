#!/usr/bin/env bash

cbcopy=""
logmsg="$(cat)"

function get_script_dir {
	SOURCE="${BASH_SOURCE[0]}"
	while [ -h "$SOURCE" ]; do
		DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
		SOURCE="$(readlink "$SOURCE" 2>/dev/null)"
		[[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
	done
	DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
	echo "$DIR"
}

if [[ "$logmsg" = *"<>KNEX<>"* ]]; then cbcopy=".[0].q"; fi

kitty @ launch --no-response \
	--copy-env \
	--env CBCOPY="$cbcopy" \
	--cwd="$(get_script_dir)" \
	bash -c "./expandLog/with-kitty.sh '$1'"
