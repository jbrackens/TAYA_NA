#!/usr/bin/env bash
# shellcheck disable=SC2086

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
source "./argsets.sh"
source "./pg-fns.sh"
source "./resolvers.sh"
source "./common.sh"

main() {
	local db_url
	db_url=$(get_conn_url "$1")
	read -ra tables < <(dedupe_array "${@:2}")
	[[ -n $flag_cache ]] && verify_cache "$db_url" "${tables[@]}"
	do_prep "$db_url" "${tables[@]}"
	run_importer "$db_url" "$(get_filt_qry)" "${tables[@]}"
}

case "$1" in
rsg)
	main rs $RSG __migrations__
	;;
csc)
	main cs $CSC __migrations__
	;;
gssome)
	main gs $GSSOME __migrations__
	;;
gsmore)
	main gs $GSMORE __migrations__
	;;
gsmost)
	main gs $GSMOST __migrations__
	;;
gsmax)
	main gs $GSMAX __migrations__
	;;
gsg)
	main gs $GSGMS
	;;
gsr)
	main gs $GSRSK
	;;
gsp)
	main gs $GSLOC players
	;;
gspf)
	main gs $GSLOC affiliates persons players users risk_types risks player_frauds player_events
	;;
*) main "$@" ;;
esac
