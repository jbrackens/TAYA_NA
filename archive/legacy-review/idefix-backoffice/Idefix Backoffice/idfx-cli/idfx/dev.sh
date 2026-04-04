#!/usr/bin/env bash
# shellcheck disable=SC2154 disable=SC2048 disable=SC2086

# shellcheck source=./src/utils.sh
source "$SRC_DIR/utils.sh"

list_watches() (
  shopt -s globstar extglob
  \ls -lT $*
)

function hot_reload {
  local a='' b='' vp_w=$(tput cols) watch=() incl_base
  local script=$1
  if [[ -z "$script" ]]; then
    script="$BIN_DIR/idfx scratch"
  fi
  if [[ $script = "self" ]]; then
    script="$BIN_DIR/idfx scratch"
    watch=("$SRC_DIR/scratch.sh")
  fi

  if [[ "$1" != "self" ]]; then
    for w in "${@:2}"; do
      if [[ "$w" = "+"* ]]; then
        incl_base=true
        local ww="${w#+}"
        watch+=("${ww/#\~/"$HOME"}")
      else
        watch+=("${w/#\~/"$HOME"}")
      fi
    done
    if [[ "${#watch}" -eq 0 || -n $incl_base ]]; then
      watch+=("$PRJ_ROOT/*/**/*" "$PRJ_ROOT/!(dev.sh)")
    fi
  fi
  local msg="$(printf "\e[7m >>> EXECUTING: '%s' <<< \e[m" "$script")"
	local vcols vrows
  while true; do
    b="$(list_watches ${watch[*]})"
    if [[ $a != "$b" || $vrows != "$(tput lines)" || $vcols != "$(tput cols)" ]]; then
      printf "\n\n"
      center_align "$msg"
      vcols=$(tput cols)
      vrows=$(tput lines)
      a=$b && eval $script
    fi
    sleep 0.5
  done
}

hot_reload "$@"
