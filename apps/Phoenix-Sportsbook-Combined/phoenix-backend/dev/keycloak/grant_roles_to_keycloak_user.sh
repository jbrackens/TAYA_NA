#!/bin/bash

set -e -o pipefail -u

if [[ $# -lt 4 ]]; then
  echo "Usage: $(basename "$0") <keycloak-realm> <keycloak-url> <username> <role> [<role>...]" >&2
  echo >&2
  echo "Example: $(basename "$0") phoenix http://localhost:8080/auth trader-user trader operator" >&2
  exit 1
fi

if [[ -z ${KEYCLOAK_ADMIN_PASSWORD-} ]]; then
  echo "Required environment variable 'KEYCLOAK_ADMIN_PASSWORD' is missing" >&2
  exit 1
fi

keycloak_realm=$1
keycloak_url=$2
username=$3
shift 3

# We can pass `--insecure` since the communication happens within localhost.
curl_flags="--fail --insecure --ipv4 --silent --show-error"

echo 'Obtaining Keycloak access token...'
keycloak_access_token=$(curl $curl_flags -X POST \
  "${keycloak_url}/realms/master/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=password&username=admin&password=$KEYCLOAK_ADMIN_PASSWORD&client_id=admin-cli" \
| jq -r '.access_token')

echo -n "Obtaining user id for $username... "
user_id=$(curl $curl_flags \
  "${keycloak_url}/admin/realms/${keycloak_realm}/users?username=$username&exact=true" \
  -H "Authorization: Bearer $keycloak_access_token" \
| jq -r '.[0].id')
echo "$user_id"

if [[ -z "$user_id" || "$user_id" == "null" ]]; then
  echo "Unable to locate Keycloak user '$username'" >&2
  exit 1
fi

echo 'Obtaining realm roles...'
all_roles_json=$(curl $curl_flags \
  "${keycloak_url}/admin/realms/${keycloak_realm}/roles" \
  -H "Authorization: Bearer $keycloak_access_token")

role_payloads=()
for role_name in "$@"; do
  if [[ -z "$role_name" ]]; then
    continue
  fi

  role_json=$(jq -c --arg role_name "$role_name" '.[] | select(.name == $role_name)' <<< "$all_roles_json")
  if [[ -z "$role_json" ]]; then
    echo "Keycloak realm role '$role_name' does not exist in realm '$keycloak_realm', creating it..."
    create_payload=$(jq -nc --arg name "$role_name" --arg description "Local development role for $role_name" \
      '{name: $name, description: $description}')
    curl $curl_flags -X POST \
      "${keycloak_url}/admin/realms/${keycloak_realm}/roles" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $keycloak_access_token" \
      -d "$create_payload" \
      > /dev/null

    all_roles_json=$(curl $curl_flags \
      "${keycloak_url}/admin/realms/${keycloak_realm}/roles" \
      -H "Authorization: Bearer $keycloak_access_token")
    role_json=$(jq -c --arg role_name "$role_name" '.[] | select(.name == $role_name)' <<< "$all_roles_json")
  fi

  if [[ -z "$role_json" ]]; then
    echo "Unable to create or locate Keycloak realm role '$role_name' in realm '$keycloak_realm'" >&2
    exit 1
  fi

  role_payloads+=("$role_json")
done

if [[ ${#role_payloads[@]} -eq 0 ]]; then
  echo "No roles requested for $username, skipping role grant"
  exit 0
fi

role_payload=$(printf '%s\n' "${role_payloads[@]}" | jq -s '.')

echo "Granting roles [$(printf '%s ' "$@" | sed 's/[[:space:]]*$//')] to $username..."
curl $curl_flags -X POST \
  "${keycloak_url}/admin/realms/${keycloak_realm}/users/${user_id}/role-mappings/realm" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $keycloak_access_token" \
  -d "$role_payload"
