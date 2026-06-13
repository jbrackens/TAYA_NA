#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 3 ]]; then
  echo "Usage: $(basename $0) <keycloak-realm> <keycloak-url> <username>"
  echo
  echo "Example: $(basename $0) phoenix https://localhost:8443/auth plipski-test"
  exit 1
fi

if [[ -z ${KEYCLOAK_ADMIN_PASSWORD-} ]]; then
  echo "Required environment variable 'KEYCLOAK_ADMIN_PASSWORD' is missing"
  exit 1
fi

keycloak_realm=$1
keycloak_url=$2
username=$3

# We can pass `--insecure` since the communication happens within localhost.
curl_flags="--fail --insecure --ipv4 --silent --show-error"

echo 'Obtaining Keycloak access token...'
keycloak_access_token=$(curl $curl_flags -X POST \
  "${keycloak_url}/realms/master/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=password&username=admin&password=$KEYCLOAK_ADMIN_PASSWORD&client_id=admin-cli" \
| jq -r '.access_token')

echo 'Obtaining admin role...'
admin_role_json=$(curl $curl_flags \
  "${keycloak_url}/admin/realms/${keycloak_realm}/roles" \
  -H "Authorization: Bearer $keycloak_access_token" \
| jq -c '.[] | select(.name == "admin")')

echo -n "Obtaining user id for $username... "
# Note that without exact=true, this endpoint will match all users whose name CONTAIN the given string,
# see https://www.keycloak.org/docs-api/15.0/rest-api/index.html#_users_resource
user_id=$(curl $curl_flags \
  "${keycloak_url}/admin/realms/${keycloak_realm}/users?username=$username&exact=true" \
  -H "Authorization: Bearer $keycloak_access_token" \
| jq -r '.[0].id')
echo "$user_id"

echo "Granting admin role to $username..."
curl $curl_flags -X POST \
  "${keycloak_url}/admin/realms/${keycloak_realm}/users/${user_id}/role-mappings/realm" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $keycloak_access_token" \
  -d "[${admin_role_json}]"
