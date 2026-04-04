#! /usr/bin/env bash
set -eauo pipefail

TKE_NODE_HARDENING="${TKE_NODE_HARDENING:-false}"

if [[ "${EUID}" -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

function usage() {
    echo "Usage: ${0} "
    echo "   --tke-node-hardening"
    echo "             Flag used to mark script to be executed as TKE node hardening"
    echo
}

function set_motd() {
  echo "Configuring the motd "
  cat << EOL > /etc/motd
================================================
************************************************
***                                          ***
***   You are responsible for all activity   ***
***          performed on this server        ***
***       All config changes are logged      ***
***                                          ***
***          For further Information         ***
***            please contact with:          ***
***                                          ***
***             EEG DevOps                   ***
***             devops@eeg.tech              ***
***                                          ***
************************************************
================================================
EOL
  echo "Configuring the motd - Completed "
}

function update_system() {
  echo "Update and Upgrade the OS"
  yum -y update --security >/dev/null
  echo "Update and Upgrade the OS - Completed "
}

function disable_compilers() {
  echo "Disabling Compilers"
  for compiler in as gcc byacc kgcc cc; do
    locations="$(which -a $compiler 2>/dev/null)" || continue
    while IFS= read -r instance ; do
      echo "  - ${instance}"
      chmod 000 "${instance}" >/dev/null 2>&1
    done <<< "${locations}"
  done
  echo "Disabling Compilers - Completed "
}

function config_timezone() {
  echo "Setting TimeZone to GMT+0"
  ln -fs /usr/share/zoneinfo/GMT+0 /etc/localtime
  echo "Setting TimeZone to GMT+0 - Completed"
}

function config_permission_cron_daily() {
  echo "Ensure permission are properly configured for daily cron job "
  chown root:root /etc/cron.daily/ && chmod og-rwx /etc/cron.daily/
  echo "Ensure permission are properly configured for daily cron job  - Completed"
}

function daily_update_cronjob() {
  echo "Adding Daily System Update Cron Job"
  local tmp_file=$(mktemp)
  echo "@daily yum -y update --security" > "${tmp_file}"
  crontab "${tmp_file}"
  rm "${tmp_file}"
  echo "Adding Daily System Update Cron Job - Completed"
}

#Ensure SSH MaxAuthTries is set to 4 or less
function ssh_max_tries() {
  echo "Ensure SSH MaxAuthTries is set to 4 or less"
  grep -e "^(\s*)MaxAuthTries\s+\S+(\s*#.*)?\s*$" /etc/ssh/sshd_config && sed -ri "s/^(\s*)MaxAuthTries\s+\S+(\s*#.*)?\s*$/\1MaxAuthTries 4\2/" /etc/ssh/sshd_config || echo "MaxAuthTries 4" >>/etc/ssh/sshd_config
  echo "Ensure SSH MaxAuthTries is set to 4 or less - Completed"
}


function main() {
  if [ ${#} -gt 0 ] ; then
    local param="${1}"
    shift
    case "${param}" in
      --tke-node-hardening)
        TKE_NODE_HARDENING=true
        ;;
      *)
        echo "Wrong parameter - '${param}'"
        usage
        exit 1
        ;;
    esac
  fi
  if [ "${TKE_NODE_HARDENING}" = "true" ] ; then
    echo "Script mode: TKE_NODE_HARDENING"
  else
    echo "Script mode: NORMAL"
    update_system
    daily_update_cronjob
  fi
  set_motd
  disable_compilers
  config_timezone
  config_permission_cron_daily
  ssh_max_tries
}

main ${*}
