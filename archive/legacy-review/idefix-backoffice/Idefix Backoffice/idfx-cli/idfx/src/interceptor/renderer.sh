#!/usr/bin/env bash
# shellcheck disable=SC2154
set -e

# shellcheck source=../utils.sh
source "$SRC_DIR/utils.sh"
# shellcheck source=../launcher/signals.sh
source "$LAUNCHER_DIR/signals.sh"

appnd_tab() {
	printf "%s" "$1"
	for ((i = 0; i < $(($2)); i++)); do printf "\t"; done
}

parse_width_arg() {
	local existingwd="$2"
	local wdarg="${1:-$existingwd}"
	if [[ "$wdarg" = "+"* ]]; then
		echo -n "$((${existingwd:-0} + ${wdarg#+}))"
	else
		echo -n "$wdarg"
	fi
}

parse_render_str() {
	local input=$1
	local value width modifier transform tb_count
	# Extract "value"
	if [[ "$input" == *'|'* ]]; then
		value=$(awk -F'|' '{print $1}' <<<"$input")
	elif [[ "$input" =~ .*%(\.[0-9]+)?[sdfegxoc].* ]]; then
		value=$(awk -F'%' 's=(length($0)-length($NF)){print substr($0,0,s-1)}' <<<"$input")
	elif [[ "$input" =~ .*\<[0-9]\;?.* ]]; then
		value=$(awk -F'<' 's=(length($0)-length($NF)){print substr($0,0,s-1)}' <<<"$input")
	elif [[ "$input" =~ .*\>[1-9]+ ]]; then
		value=$(awk -F'>' '{print $1}' <<<"$input")
	else
		value=$input
	fi
	input=${input#"$value"}
	# Extract "width", if any
	if [[ "$input" == '|'* ]]; then
		input=${input#"|"}
		width=$(awk -F'[%|<>]' '{print $1}' <<<"$input")
		input=${input#"$width"}
	fi
	# Extract "modifier", if any
	if [[ "$input" == '%'* ]]; then
		input=${input#"%"}
		modifier=$(awk -F'[<>]' '{print $1}' <<<"$input")
		input=${input#"$modifier"}
	fi
	# Extract "transform", if any
	if [[ "$input" == '<'* ]]; then
		input=${input#"<"}
		transform=$(awk -F'>' '{print $1}' <<<"$input")
		input=${input#"$transform"}
	fi
	# Extract "trailing tab count", if any
	if [[ "$input" == '>'* ]]; then
		input=${input#">"}
		tb_count=$(awk -F'>' '{print $1}' <<<"$input")
		input=${input#"$transform"}
	fi

	echo "$value"
	echo "$width"
	echo "$modifier"
	echo "$transform"
	echo "$tb_count"
}

render_cell() {
	local debug="$6"
	mapfile -t prtp < <(parse_render_str "$1")
	local wd="$2" mod="$3" esq="$4" tb="$5" prt
	local prtv="${prtp[0]}" prtw="${prtp[1]}" prtm="${prtp[2]}" prtc="${prtp[3]}" prtt="${prtp[4]}"
	prt="$prtv"
	if [[ -n "$prtm" || -n "$mod" ]]; then
		local md="${prtm:-$mod}"
		prt="$(printf "%${md:-s}" "$prt")"
	fi
	if [[ -n "$prtw" || -n "$wd" ]]; then
		local wd_="$(parse_width_arg "${prtw}" "$wd")"
		prt="$(printf "%${wd_}s" "$prt")"
	else
		prt="$(printf "%s" "$prt")"
	fi
	if [[ -n "$prtc" || -n "$esq" ]]; then
		prt="$(printf "\e[${prtc:-$esq}m%s\e[m" "$prt")"
	fi
	if [[ -n "$prtt" || -n "$tb" ]]; then
		prt="$(appnd_tab "$prt" "${prtt:-$tb}")"
	fi
	printf "%s" "$prt"
}

render_row() {
	local args=("$@") posns=() opts=() output=""
	for a in "${args[@]}"; do
		if [[ "$a" == "-"* ]]; then
			opts+=("$a")
		else
			posns+=("$a")
		fi
	done
	local vcols="$(tput cols)"
	local rndr_cols=$(compute_col_render_level)
	local data=("${posns[@]}")
	local ord="vl" debug=0 \
		spad=5 stb=0 epad=0 etb=0 \
		hwd hesq hmod htb \
		fwd fesq fmod ftb \
		lwd lesq lmod ltb \
		vwd vesq vmod vtb
	spad=$(((vcols - rndr_cols) / 2))
	for o in "${opts[@]}"; do
		case "$o" in
		"-lv") ord="lv" ;;
		"-dbg") debug=1 ;;
		-h=* | -l=* | -v=* | -f=* | -s=* | -e=*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			mapfile -t prtp < <(parse_render_str "$value")
			case $key in
			"h")
				hwd="$(parse_width_arg "${prtp[1]}" "$hwd")"
				hmod="${prtp[2]:-$hmod}"
				hesq="${prtp[3]:-$hesq}"
				htb="${prtp[4]:-$htb}"
				;;
			"l")
				lwd="$(parse_width_arg "${prtp[1]}" "$lwd")"
				lmod="${prtp[2]:-$lmod}"
				lesq="${prtp[3]:-$lesq}"
				ltb="${prtp[4]:-$ltb}"
				;;
			"v")
				vwd="$(parse_width_arg "${prtp[1]}" "$vwd")"
				vmod="${prtp[2]:-$vmod}"
				vesq="${prtp[3]:-$vesq}"
				vtb="${prtp[4]:-$vtb}"
				;;
			"f")
				fwd="$(parse_width_arg "${prtp[1]}" "$fwd")"
				fmod="${prtp[2]:-$fmod}"
				fesq="${prtp[3]:-$fesq}"
				ftb="${prtp[4]:-$ftb}"
				;;
			"s")
				spad="$(parse_width_arg "${prtp[1]}" "$spad")"
				stb="${prtp[4]:-$stb}"
				;;
			"e")
				epad="${prtp[1]:-$epad}"
				stb="${prtp[4]:-$etb}"
				;;
			esac
			;;
		"-"*"pad="*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			case $key in
			"spad") spad="$value" ;;
			"epad") epad="$value" ;;
			esac
			;;
		"-"*"esq="*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			case $key in
			"hesq") hesq="$value" ;;
			"fesq") fesq="$value" ;;
			"lesq") lesq="$value" ;;
			"vesq") vesq="$value" ;;
			esac
			;;
		"-"*"mod="*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			case $key in
			"hmod") hmod="$value" ;;
			"fmod") fmod="$value" ;;
			"lmod") lmod="$value" ;;
			"vmod") vmod="$value" ;;
			esac
			;;
		"-"*"tb="*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			case $key in
			"stb") stb="$value" ;;
			"htb") htb="$value" ;;
			"ftb") ftb="$value" ;;
			"ltb") ltb="$value" ;;
			"vtb") vtb="$value" ;;
			"etb") etb="$value" ;;
			esac
			;;
		"-"*"wd="*)
			key="${o%%=*}"
			key="${key#-}"
			value="${o#*=}"
			case $key in
			"hwd") hwd="$value" ;;
			"fwd") fwd="$value" ;;
			"lwd") lwd="$value" ;;
			"vwd") vwd="$value" ;;
			esac
			;;
		esac
	done
	if [[ "$spad" -gt 0 ]]; then
		output+="$(printf "%-${spad}s" "")"
		if [[ "$stb" -gt 0 ]]; then output="$(appnd_tab "$output" "$stb")"; fi
	fi
	for ((i = 0; i < "${#data[@]}"; i++)); do
		mapfile -t cmps <<<"$(awk -F ':=' '{for(i=1;i<=NF;i++) print $i}' <<<"${data[$i]}")"
		if [[ "${#cmps[@]}" -eq 1 ]]; then
			if ((i == 0)); then
				output+="$(render_cell "${cmps[0]}" "$hwd" "$hmod" "$hesq" "$htb" "$debug")"
			else
				output+="$(render_cell "${cmps[0]}" "$fwd" "$fmod" "$fesq" "$ftb" "$debug")"
			fi
		else
			local lbl="$(render_cell "${cmps[0]}" "$lwd" "$lmod" "$lesq" "$ltb")"
			local val="$(render_cell "${cmps[1]}" "$vwd" "$vmod" "$vesq" "$vtb")"
			if [[ "$ord" = "vl" ]]; then
				output+="$(printf "%s %s" "$val" "$lbl")"
			else
				output+="$(printf "%s %s" "$lbl" "$val")"
			fi
		fi
	done
	if [[ $output = *"$(printf '\t')" ]]; then
		output="${output%\\t}"
	fi
	if [[ "$epad" -gt 0 ]]; then
		output+="$(printf "%-${epad}s" "")"
		if [[ "$etb" -gt 0 ]]; then output="$(appnd_tab "$output" "$etb")"; fi
	fi
	if [[ "$debug" -eq 1 ]]; then
		local stripped_msg=$(strip_escapes "$output")
		local msg_len=${#stripped_msg}
		local m="$(printf "%4s | %s" "$msg_len" "$output")"
		dbg "$m"
	fi
	printf "\n%s" "$output"
}

render_last_request() {
	local module="$1" addr="$2" code="$3" dur="$4" \
		dur_ms="$5" fmtdt="$6" method="$7" \
		start="$8" status="$9" uri_full="${10}"
	local uri="${uri_full/\/api\/v1\/$module/}"
	local uri_qst="${uri#*\?}" uri_qs=""
	local uri_path="${uri%%\?*}"
	if [[ -n "$uri_qst" && "$uri_qst" != "$uri_path" ]]; then uri_qs="?$uri_qst"; fi
	local status_len=${#status}
	local method_len=${#method}
	local rndr_cols=$(compute_col_render_level)
	local uri_maxlen="$((rndr_cols - status_len - method_len - 2))"
	if ((${#uri} > uri_maxlen)); then uri="${uri:0:$((uri_maxlen - 3))}..."; fi
	local left_cols="$((method_len + uri_maxlen))"
	local stus_color="$([ "$code" -ge 500 ] && echo "31" || echo "32")"
	local left_width
	local col_render_level=$(compute_col_render_level)
	if ((rndr_cols == 98)); then
		left_width=71
	elif ((rndr_cols == 88)); then
		left_width=61
	elif ((rndr_cols == 78)); then
		left_width=51
	elif ((rndr_cols == 68)); then
		left_width=41
	fi
	local r2spcer1=$((rndr_cols - (10 + left_width + 2)))
	render_row "Last Request|-10<2;37" "|$r2spcer1" "$addr - $fmtdt|$left_width"
	# local r2spcer2=$((WIDTH - (status_len + left_cols) - 1))
	render_row "$status|-$status_len<0;$stus_color" " $method $uri_path" "$uri_qs|-$uri_maxlen<2;37"
}

render_interceptor_tunnel() {
	eval "$1"
	local view_rows="$2" rndr_cols="$3"
	local tnl_h1 dthd_wdth dtlb_tb dthd_tb
	if ((rndr_cols == 98)); then
		dthd_wdth=20 dthd_tb=1 dtlb_tb=2
	elif ((rndr_cols == 88)); then
		dthd_wdth=18 dthd_tb=0 dtlb_tb=2
	elif ((rndr_cols == 78)); then
		dthd_wdth=18 dthd_tb=0 dtlb_tb=1
	elif ((rndr_cols == 68)); then
		dthd_wdth=12 dthd_tb=0 dtlb_tb=1
	fi
	local tnl_h1
	if [[ $name = "payment"* ]]; then
		tnl_h1="    PAYMENTS"
	elif [[ $name = "wallet"* ]]; then
		tnl_h1="     WALLET"
	fi
	local ngrok_host="${public_url/https:\/\//}"
	local ngrok_tld="${ngrok_host/.*/}"
	local ngrok_domain="${ngrok_host/$ngrok_tld/}"
	local ngrok_full="$ngrok_host:$port"
	local ngrok_len=${#ngrok_full}
	local r2spcer=$((rndr_cols - (16 + ngrok_len)))
	local req_rates=("Reqs Rate" "1m:=$req_rate_1m" "5m:=$req_rate_5m" "15m:=$req_rate_15m")
	local req_durns=("Reqs Durn" "50%:=$req_dur_p50" "90%:=$req_dur_p90" "99%:=$req_dur_p99")
	local con_rates=("Conn Rate" "1m:=$conn_rate_1m" "5m:=$conn_rate_5m" "15m:=$conn_rate_15m")
	local con_durns=("Conn Durn" "50%:=$conn_dur_p50" "90%:=$conn_dur_p90" "99%:=$conn_dur_p99")
	local subhead_fields=(" " "Open:=$open_conns" "∑Conn:=$total_conns" "∑Reqs:=$total_requests")

	render_row "$tnl_h1|-16<7" "|$r2spcer" "$ngrok_tld<1" "$ngrok_domain|-<2;37>" ":$port|-<1>"
	local row_defaults=("-s=|+3" "-h=|-$dthd_wdth>$dthd_tb" "-l=|-5<2;37>$dtlb_tb")
	render_row "${row_defaults[@]}" "-v=|8" "${subhead_fields[@]}"
	if [[ ((view_rows -lt 1)) ]]; then
		row_defaults+=("-v=|8%.2f")
		render_row "${row_defaults[@]}" "${req_rates[@]}"
		render_row "${row_defaults[@]}" "${req_durns[@]}"
		render_row "${row_defaults[@]}" "${con_rates[@]}"
		render_row "${row_defaults[@]}" "${con_durns[@]}"
	fi
}

render_interceptor_module() {
	eval "$1"
	local view_rows="$2" rndr_cols="$3"
	local kvst_col lease_length
	local lease_ttl=" " lease_ttl_color="0"
	if [[ -n "$kv_expiry" ]]; then
		lease_ttl="$(round_human_duration "$(date +%s)" "$kv_expiry")"
		if [[ "$lease_ttl" = "-"* ]]; then
			lease_ttl="X"
			lease_ttl_color="91"
		fi
	fi
	if [[ "$kv_status" = "active" ]]; then kvst_col="92"; else kvst_col="91"; fi
	if [[ "$kv_lease_end" -gt 0 ]]; then
		lease_length="$(human_duration "$kv_lease_end")"
	elif [[ "$kv_lease_start" -gt 0 ]]; then
		lease_length="$(human_duration "$kv_lease_start")"
	fi

	local req_rates=("Reqs Rate" "1m:=$req_r1" "5m:=$req_r5" "15m:=$req_r15" "30m:=$req_r30" "60m:=$req_r60")
	local req_durns=("Reqs Durn" "50%:=$duration_p50" "75%:=$duration_p75" "90%:=$duration_p90" "95%:=$duration_p95" "99%:=$duration_p99")
	local req_mthds=("Reqs Method" "GET:=${req_mtd_get:-0}" "POST:=${req_mtd_post:-0}" "PUT:=${req_mtd_put:-0}" "PATCH:=${req_mtd_patch:-0}" "DEL:=${req_mtd_delete:-0}")
	local req_stses=("Reqs Status" "1XX:=${resp_stat_1xx:-0}" "2XX:=${resp_stat_2xx:-0}" "3XX:=${resp_stat_3xx:-0}" "4XX:=${resp_stat_4xx:-0}" "5XX:=${resp_stat_5xx:-0}")
	local subhead_fields=("${kv_status^^} ~$lease_length<$kvst_col" "TTL:=$lease_ttl<$lease_ttl_color" " := " "μDurn:=$avg_dur%.2f" " := " "∑Reqs|0:=$req_count")

	local dthd_wdth=18 dtlb_wdth=5 dtlb_tb=1 dtvl_wdth=5
	if ((rndr_cols == 88)); then
		dtvl_wdth=8
		unset "subhead_fields[2]" "subhead_fields[4]" "req_rates[4]" "req_durns[4]" "req_mthds[4]" "req_stses[1]"
	elif ((rndr_cols == 78)); then
		dtvl_wdth=8
		unset "subhead_fields[2]" "subhead_fields[4]" "req_rates[2]" "req_rates[4]" \
			"req_durns[2]" "req_durns[4]" "req_mthds[4]" "req_mthds[5]" "req_stses[1]" "req_stses[3]"
	elif ((rndr_cols == 68)); then
		dthd_wdth=12 dtvl_wdth=8
		unset "subhead_fields[2]" "subhead_fields[4]" "req_rates[2]" "req_rates[4]" \
			"req_durns[2]" "req_durns[4]" "req_mthds[4]" "req_mthds[5]" "req_stses[2]" "req_stses[3]"
	fi
	local r2spcer=$((rndr_cols - (20 + 21)))
	render_row "/api/v1/<7;$kvst_col" "$module|-12<7;$kvst_col" "|$r2spcer" "$kv_tsfmt|21<2;37"

	local row_defaults=("-h=|-$dthd_wdth" "-l=|-$dtlb_wdth<2;37>$dtlb_tb" "-v=|$dtvl_wdth")
	render_row "${row_defaults[@]}" "-h=|-$((dthd_wdth + 3))" "${subhead_fields[@]}"

	row_defaults=("-s=|+3" "${row_defaults[@]}")
	render_row "${row_defaults[@]}" "${req_rates[@]}"
	render_row "${row_defaults[@]}" -v="%.2f" "${req_durns[@]}"
	render_row "${row_defaults[@]}" "${req_mthds[@]}"
	render_row "${row_defaults[@]}" "${req_stses[@]}"

	if [[ -n "$lastreq_fmtdt" && ((view_rows -lt 2)) ]]; then
		render_last_request "$module" "$lastreq_addr" "$lastreq_code" "$lastreq_dur" "$lastreq_dur_ms" \
			"$lastreq_fmtdt" "$lastreq_method" "$lastreq_start" "$lastreq_status" "$lastreq_uri"
	fi
}

compute_row_render_level() {
	local vrows="${1:-$(tput lines)}"
	mapfile -t counts <<<"$(gojq -L"$JQ_DIR" -r 'include "tools"; get_interceptor_counts' "$INTRCPTR_STAT_FILE")"
	local tunnel_count="${counts[0]}"
	local module_count="${counts[1]}"
	local level_1=$((tunnel_count * 6 + module_count * 8 + 3))
	local level_2=$((tunnel_count * 2 + module_count * 8 + 3))
	local row_render_level="0"
	if ((vrows < level_1)); then
		if ((vrows < level_2)); then
			row_render_level="2"
		else row_render_level="1"; fi
	fi
	echo "$row_render_level"
}

compute_col_render_level() {
	local vcols="${1:-$(tput cols)}"
	local col_render_level="68"
	if ((vcols > 100)); then
		col_render_level=98
	elif ((vcols > 90)); then
		col_render_level=88
	elif ((vcols > 80)); then
		col_render_level=78
	fi
	echo "$col_render_level"
}

render_interceptor_stats() {
	local curr_rndr="" vcols=$(tput cols) vrows=$(tput lines)
	local rndr_rows="$(compute_row_render_level "$vrows")"
	local rndr_cols="$(compute_col_render_level "$vcols")"
	mapfile -t stats <<<"$(gojq -L"$JQ_DIR" -r 'include "tools"; sourceable_interceptor_stats' "$INTRCPTR_STAT_FILE")"
	for stat in "${stats[@]}"; do
		if [[ "$stat" =~ 'ent_type="tunnel"' && ! "$stat" =~ 'num_modules="0"' ]]; then
			if [[ "$curr_rndr" = "MODULE" ]]; then printf "\n"; fi
			curr_rndr="TUNNEL"
			render_interceptor_tunnel "$stat" "$rndr_rows" "$rndr_cols"
		elif [[ "$stat" =~ 'ent_type="module"' ]]; then
			curr_rndr="MODULE"
			render_interceptor_module "$stat" "$rndr_rows" "$rndr_cols"
		fi
	done
}

redraw_interceptor_monitor() {
	local output vcols vrows rndr_rows rndr_cols debug_msg debug_msg_len
	output="$(render_interceptor_stats)"
	vcols=$(tput cols)
	vrows=$(tput lines)
	rndr_rows="$(compute_row_render_level "$vrows")"
	rndr_cols="$(compute_col_render_level)"
	clear
	debug_msg="($vcols x $vrows) [ $rndr_cols x $rndr_rows ]"
	debug_msg_len="${#debug_msg}"
	printf "%s\n\n\e[0;90m%-$((rndr_cols - debug_msg_len))s%s\e[m" "$output" " " "$debug_msg"
}
