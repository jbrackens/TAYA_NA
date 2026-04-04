#!/bin/sh
set -e

execute_command() {
    msg=${1}
    shift
    echo "## ${msg}"
    eval $@
    echo "# Done"
    echo
}
execute_command "Collect Static" python3 manage.py collectstatic --noinput

execute_command "DB Migrate" python3 manage.py migrate
execute_command "provision_users" python3 manage.py provision_users
