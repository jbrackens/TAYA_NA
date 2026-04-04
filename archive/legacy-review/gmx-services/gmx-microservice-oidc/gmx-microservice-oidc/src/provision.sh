#!/bin/sh
set -e

execute_command() {
    msg=${1}
    shift
    echo "## ${msg}"
    eval "$@"
    echo "# Done"
    echo
}
execute_command "DB Migrate" python3 manage.py migrate --noinput
execute_command "Collect Static" python3 manage.py collectstatic --noinput

execute_command "provision_site" python3 manage.py provision_site
execute_command "provision_users" python3 manage.py provision_users --verbosity 2
execute_command "provision_permissions" python3 manage.py provision_permissions
execute_command "provision_rsa_key" python manage.py provision_rsa_keys
