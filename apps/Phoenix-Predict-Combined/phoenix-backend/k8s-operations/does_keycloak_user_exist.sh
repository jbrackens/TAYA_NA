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

echo -n "Checking if user $username exists... "
# Note that without exact=true, this endpoint will match all users whose name CONTAIN the given string,
# see https://www.keycloak.org/docs-api/15.0/rest-api/index.html#_users_resource
user_exists=$(curl $curl_flags \
  "${keycloak_url}/admin/realms/${keycloak_realm}/users?username=$username&exact=true" \
  -H "Authorization: Bearer $keycloak_access_token" \
| jq length)

if [[ $user_exists = 1 ]]; then
  echo YES
  exit 0
else
  echo NO
  exit 1
fi
