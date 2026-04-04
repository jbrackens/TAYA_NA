#!/usr/bin/env bash
set -e

# shellcheck source=./utils.sh
source "$SRC_DIR/utils.sh"

function spin_done {
  tput cnorm
}

function get_spinner {
  local spin charwidth
  case $1 in
  0)
    spin='-\|/'
    charwidth=1
    ;;
  1)
    spin='⠁⠂⠄⡀⢀⠠⠐⠈'
    charwidth=3
    ;;
  2)
    spin="▁▂▃▄▅▆▇█▇▆▅▄▃▂▁"
    charwidth=3
    ;;
  3)
    spin="▉▊▋▌▍▎▏▎▍▌▋▊▉"
    charwidth=3
    ;;
  4)
    spin='←↖↑↗→↘↓↙'
    charwidth=3
    ;;
  5)
    spin='▖▘▝▗'
    charwidth=3
    ;;
  6)
    spin='┤┘┴└├┌┬┐'
    charwidth=3
    ;;
  7)
    spin='◢◣◤◥'
    charwidth=3
    ;;
  8)
    spin='◰◳◲◱'
    charwidth=3
    ;;
  9)
    spin='◴◷◶◵'
    charwidth=3
    ;;
  10)
    spin='◐◓◑◒'
    charwidth=3
    ;;
  11)
    spin='⣾⣽⣻⢿⡿⣟⣯⣷'
    charwidth=3
    ;;
  esac
  printf "%s\n%s\n" "$spin" "$charwidth"
}

function print_result {
  local opts=() args=() warning="" job_id=""
  for a in "$@"; do
    if [[ "$a" == "-"* ]]; then
      opts+=("$a")
    else
      args+=("$a")
    fi
  done
  local result="${args[0]}"
  local success="${args[1]}"
  local failure="${args[2]:-$success}"
  for o in "${opts[@]}"; do
    if [[ "$o" == "-s="* ]]; then
      success="${o#*=}"
    elif [[ "$o" == "-f="* ]]; then
      failure="${o#*=}"
    elif [[ "$o" == "-w="* ]]; then
      warning="${o#*=}"
    elif [[ "$o" == "-j="* ]]; then
      job_id="${o#*=}"
    fi
  done
  if [[ -n "$job_id" ]]; then
    local job_output=$(spin_job_output -ol "$job_id" || true)
    if [[ -n "$job_output" ]]; then
      local s_tmp="$success" f_tmp="$failure" w_tmp="$warning"
      # shellcheck disable=SC2059
      success=$(printf "$s_tmp" "$job_output") failure=$(printf "$f_tmp" "$job_output") warning=$(printf "$w_tmp" "$job_output")
    fi
  fi
  local ok_char="V" fail_char="X" warn_char="!"
  if [[ ${LANG} == *"UTF-8"* ]]; then
    ok_char="$(printf "\u2714")"
    fail_char="$(printf "\u2717")"
    warn_char="$(printf "\u26A0")"
  fi
  tput el
  if [[ "$result" -eq 0 ]]; then
    printf "\e[1;92m%s\e[m  %s\n" "$ok_char" "$success"
  else
    if [[ -n "$warning" ]]; then
      printf "\e[0;93m%s\e[m  %s\n" "$warn_char" "$warning"
    else
      printf "\e[1;91m%s\e[m  %s\n" "$fail_char" "$failure"
    fi
  fi
}

function spinner {
  set +e
  local LC_CTYPE=C
  trap spin_done EXIT SIGINT SIGTERM
  local opts=() cmd=() split=0
  for a in "$@"; do
    if [[ "$a" == "--" ]]; then
      split=1
    elif [[ $split -eq 0 ]]; then
      opts+=("$a")
    else
      cmd+=("$a")
    fi
  done
  local delay=0.1 title="${cmd[*]}" spin_type="11" jid="" quiet_mode=0
  for o in "${opts[@]}"; do
    case $o in
    -j=*)
      jid="${o#*=}"
      ;;
    -s=*)
      spin_type="${o#*=}"
      ;;
    -d=*)
      delay="${o#*=}"
      ;;
    -t=*)
      title="${o#*=}"
      ;;
    -qq)
      quiet_mode=2
      ;;
    -q)
      quiet_mode=1
      ;;
    esac
  done
  mapfile -t spin_fmt < <(get_spinner "$spin_type")
  local i=0 spin_char="${spin_fmt[0]}" spin_width="${spin_fmt[1]}"
  local spin_output="$(spin_job_fname "$jid")"
  "${cmd[@]}" &>"$spin_output" &
  local pid=$!
  tput civis
  while kill -0 $pid 2>/dev/null; do
    i=$(((i + spin_width) % ${#spin_char}))
    tput sc
    printf "\e[1;94m%s\e[m  %s" "${spin_char:$i:$spin_width}" "$title"
    sleep "$delay"
    tput rc
  done
  wait $pid
  return $?
}

function main {
  set +e
  local spin_args=() main_args=() quiet_mode=0 job_id="" fwd_output=0 show_output=0 delim=" -- "
  local ok_opt fail_opt warn_opt
  for a in "$@"; do
    if [[ "$a" =~ ^-([sdtx]\=|[qp]) ]]; then
      spin_args+=("$a")
    elif [[ "$a" = "-j="* ]]; then
      job_id="${a#*=}"
      spin_args+=("$a")
    elif [[ "$a" = "--ok="* ]]; then
      ok_opt="${a#*=}"
    elif [[ "$a" = "--fail="* ]]; then
      fail_opt="${a#*=}"
    elif [[ "$a" = "--warn="* ]]; then
      warn_opt="${a#*=}"
    elif [[ "$a" = "-p" || "$a" = "-o" ]]; then
      show_output=1
    elif [[ "$a" = "-fwd" ]]; then
      fwd_output=1
    else
      main_args+=("$a")
    fi
  done
  local show_output="$(if [[ $IDFX_VERBOSE -ge 2 ]]; then echo "1"; fi)"
  if arr_contains "-qq" "${spin_args[@]}"; then
    quiet_mode=2
  elif arr_contains "-q" "${spin_args[@]}"; then
    quiet_mode=1
  fi
  if [[ "$fwd_output" -eq 1 && -z "$job_id" ]]; then fwd_output=0; fi
  local desc="${main_args[0]}"
  local success="${main_args[1]:-${ok_opt:-$desc}}"
  local failure="${main_args[2]:-${fail_opt:-$desc}}"
  mapfile -t jobs <<<"$(cat)"
  local cmd ret jcmd jdesc pstep jlen="${#jobs[@]}"
  for ((ji = 0; ji < jlen; ji++)); do
    local j="${jobs[$ji]}"
    pstep="" jcmd=${j%"$delim"*} jdesc=${j##*"$delim"}
    if [[ "$jcmd" == "$jdesc" ]]; then
      jdesc="$desc"
    else
      pstep="$jdesc"
    fi
    readarray -t cmd < <(printf '%s' "$jcmd" | xargs -n1)
    spinner "${spin_args[@]}" -t="${jdesc}" -- "${cmd[@]}"
    ret=$?
    if [[ -n "$pstep" ]]; then
      if [[ ("$ret" -ne "0" && "$quiet_mode" -ne 2) || "$quiet_mode" -eq 0 || -n "$warn_opt" ]]; then
        print_result "$ret" "$pstep" -w="$warn_opt"
      fi
    fi
    [[ "$ret" -ne 0 ]] && break
    if [[ "$show_output" -eq 1 ]] && ((ji != jlen - 1)); then
      local spin_output="$(spin_job_fname "$job_id")"
      if exists_with_content "$spin_output"; then
        awk '{print "├   " $0}' "$spin_output"
      fi
    fi
  done
  if [[ ("$ret" -ne "0" && "$quiet_mode" -ne 2) || "$quiet_mode" -eq 0 || -n "$warn_opt" || "$show_output" -eq 1 ]]; then
    if [[ "$fwd_output" -eq 1 ]]; then
      print_result "$ret" "$success" "$failure" -w="$warn_opt" -j="$job_id"
    else
      print_result "$ret" "$success" "$failure" -w="$warn_opt"
    fi
  else
    tput el
  fi

  if [[ "$show_output" -eq 1 ]]; then
    local spin_output="$(spin_job_fname "$job_id")"
    if exists_with_content "$spin_output"; then
        awk '{print "├   " $0}' "$spin_output"
    fi
  fi
  return "$ret"
}

case $1 in
demo)
  shift
  spinner "$@"
  ;;
*)
  main "$@"
  ;;
esac
