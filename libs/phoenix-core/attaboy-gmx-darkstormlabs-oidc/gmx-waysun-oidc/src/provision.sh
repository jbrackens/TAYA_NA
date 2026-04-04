#!/bin/sh
set -e

execute_command() {
    msg=${1}
    shift
    echo "------------------------"
    echo "-- ${msg}"
    echo "------------------------"
    eval "$@"
    echo
    echo "------------------------"
    echo "-- Done"
    echo "------------------------"
    echo
}

echo
echo "##############################"
echo "##   PROVISION START"
echo "##############################"

execute_command "DB Migrate" python3 manage.py migrate --noinput --no-color
execute_command "Collect Static" python3 manage.py collectstatic --noinput --no-color
execute_command "provision_site" python3 manage.py provision_site  --no-color
execute_command "provision_rsa_key" python manage.py provision_rsa_keys  --no-color
execute_command "provision_users" python3 manage.py provision_users  --no-color
execute_command "provision_permissions" python3 manage.py provision_permissions  --no-color
execute_command "provision_oidc_client" python3 manage.py provision_oidc_client  --no-color

echo
echo "##############################"
echo "##   PROVISION END"
echo "##############################"
