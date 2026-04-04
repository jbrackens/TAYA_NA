#!/usr/bin/env bash
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"

viz() {
	local db="${1:-"gs"}" query="" name="" ts="$(date +%Y-%m-%d-%H-%M-%S)" fname=""
	local conn_url="$(get_conn_url "$db")"
	if [[ -n "$2" ]]; then
		if [[ -f "$2" ]]; then
			query="$(cat "$2")"
			name="$(basename "$2" ".sql")"
		elif [[ -d "$2" ]]; then
			for f in "$2"/*.sql; do
				if [[ -f "$f" ]]; then
					viz "$db" "$f"
				fi
			done
		else
			query="$2"
		fi
	elif [[ -z "$query" ]]; then
		query="$(cat)"
	fi
	if [[ -z "$query" ]]; then
		log2 "No query provided"
		return 1
	fi
	if [[ -z "$name" ]]; then
		name="$(echo -n "$query" | shasum -a 256 | awk '{print $1}')"
	fi
	fname="$ts-$db-$name"
	pev_html="$PEV_DATA_DIR/$fname.html"
	log "Executing Query, and gathering info..."
	exec_sql "$conn_url" -Xq -o "$PEV_DATA_DIR/$fname.json" <<-EOM
		EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
		$query
	EOM
	log "Visualizing results..."
	PEV_PLAN_B64="$(jq <"$PEV_DATA_DIR/$fname.json" -r '@base64')" \
	PEV_QUERY_B64="$(base64 <<<"$query")" \
		envsubst <"$ASSET_DIR/pev.tmpl.html" >"$pev_html"
	sleep 0.5
	open "$pev_html"
}

case "$1" in
*)
	viz "$@"
	;;
esac
