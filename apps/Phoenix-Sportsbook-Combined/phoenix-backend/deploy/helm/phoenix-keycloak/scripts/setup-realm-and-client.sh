#!/bin/env bash

set -e -o pipefail -u

if [[ $# -ne 3 ]]; then
  echo "Usage: $(basename $0) <target-keycloak-namespace> <realm-to-create> <client-to-create-in-realm>"
  echo
  echo "Example: $(basename $0) keycloak phoenix phoenix-backend"
  exit 1
fi

keycloak_namespace=$1
keycloak_realm=$2
keycloak_client=$3

echo -e 'Waiting for Keycloak pod to become ready...'

function pod_ready() {
  local namespace pod_name status
  namespace=$1
  pod_name=$2
  status=$(kubectl get pods -n "$namespace" -o jsonpath='{ .items[?(@.metadata.name == "'$pod_name'")].status.conditions[?(@.type == "Ready")].status }')
  [[ $status == True ]]
}

while ! pod_ready "$keycloak_namespace" keycloak-0; do
  echo 'Pod not ready yet, waiting 5 seconds...'
  sleep 5
done

# We can pass `--insecure` since the communication happens within the cluster.
curl_flags="--fail --insecure --silent --show-error -HAccept:application/json -HCache-Control:no-cache"

keycloak_url=https://keycloak.${keycloak_namespace}.svc.cluster.local:8443/auth

echo -e '\nObtaining Keycloak admin password...'
keycloak_admin_password=$(kubectl get secret -n "$keycloak_namespace" credential-keycloak -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d)
keycloak_admin_username=$(kubectl get secret -n "$keycloak_namespace" credential-keycloak -o jsonpath='{.data.ADMIN_USERNAME}' | base64 -d)

while true; do
  echo 'Obtaining Keycloak access token...'
  keycloak_access_token=$(curl $curl_flags -X POST \
      ${keycloak_url}/realms/master/protocol/openid-connect/token \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      -d "grant_type=password&username=$keycloak_admin_username&password=$keycloak_admin_password&client_id=admin-cli" \
    | jq -r '.access_token') || {
      cat <<'EOF'
        Authentication as `admin` against this Keycloak instance failed.

        One of the possible causes is what's described in PHXD-3266 and https://github.com/keycloak/keycloak-operator/issues/456:
        keycloak-operator regenerated `credential-keycloak` k8s Secret,
        while the contents of `secret_data` column in `credential` table in Keycloak database remained the same
        (i.e. still corresponding to the old pre-regeneration password).

        If that's the case, there are two possible remedies:

        1) if you somehow still have access to the old admin password:

           overwrite the password in `credential-keycloak` k8s Secret with the old admin password

        2) if, more likely, the old admin password is definitely lost:

           update the `value` JSON field in `secret_data` column in `credential` table in Keycloak DB,
           in the row corresponding to `admin` user (join with `user_entity` table on `user_id` = `id`).
           The hash value should be generated using PBKDF2-SHA256 algorithm, using the following inputs:

           * salt: same as already present in `salt` JSON field of `secret_data`
             (can theoretically be any other, as long as this `salt` field is updated as well)
           * password: the new admin password stored in `credential-keycloak` k8s Secret

           and the following config:

           * iterations: 27500, as indicated by `hashIterations` JSON field in `credential_data` column in `credential` table
           * desired key length: 512 bits (will result in a base64 string of length 89)

           Then, restart Keycloak server - just an update in the DB seems to insufficient,
           probably due to some Keycloak's internal caching.
EOF
    }

  echo "Getting the current state of $keycloak_realm realm..."
  if realm_json=$(curl $curl_flags -X GET \
      ${keycloak_url}/admin/realms/${keycloak_realm} \
      -H "Authorization: Bearer $keycloak_access_token"); then
    break
  else
    echo 'Realm not ready yet, sleeping 5 seconds...'
    sleep 5
  fi
done

# Note that refresh token timespan (which we want to decrease from default 30 to 15 minutes)
# is set to the smallest value among (SSO Session Idle, Client Session Idle, SSO Session Max, and Client Session Max).
# See https://stackoverflow.com/a/67624190
echo 'Updating Client Session Idle timeout realm setting...'
patched_realm_json=$(echo "$realm_json" | jq '.clientSessionIdleTimeout = 900')
curl $curl_flags -X PUT \
    ${keycloak_url}/admin/realms/${keycloak_realm} \
    -H "Authorization: Bearer $keycloak_access_token" \
    -H 'Content-Type: application/json' \
    -d "$patched_realm_json"

echo -n "Check if 'punters' group already exists... "
punter_group=$(curl $curl_flags -X GET \
    ${keycloak_url}/admin/realms/${keycloak_realm}/groups \
    -H "Authorization: Bearer $keycloak_access_token" \
  | jq -r '.[] | .name | select(. == "punters")')

if [[ $punter_group ]]; then
  echo YES
else
  echo NO
  echo "Creating 'punters' group..."
  curl $curl_flags -X POST \
      ${keycloak_url}/admin/realms/${keycloak_realm}/groups \
      -H "Authorization: Bearer $keycloak_access_token" \
      -H 'Content-Type: application/json' \
      -d '{"name": "punters"}'
fi

while true; do
  echo "Obtaining $keycloak_client client UUID... "
  client_uuid=$(curl $curl_flags -X GET \
      ${keycloak_url}/admin/realms/${keycloak_realm}/clients?clientId=$keycloak_client \
      -H "Authorization: Bearer $keycloak_access_token" \
    | jq -r '.[0].id')

  if [[ $client_uuid != "null" ]]; then
    break
  else
    echo 'Client not ready yet, sleeping 5 seconds...'
    sleep 5
  fi
done

echo "Obtaining $keycloak_client client service account UUID..."
service_account_user_uuid=$(curl $curl_flags -X GET \
    ${keycloak_url}/admin/realms/${keycloak_realm}/clients/${client_uuid}/service-account-user \
    -H "Authorization: Bearer $keycloak_access_token" \
  | jq -r '.id')

echo 'Obtaining realm-management client UUID...'
realm_management_client_uuid=$(curl $curl_flags -X GET \
    ${keycloak_url}/admin/realms/${keycloak_realm}/clients?clientId=realm-management \
    -H "Authorization: Bearer $keycloak_access_token" \
  | jq -r '.[0].id')

# Note that view-users is a composite role that also includes both query-groups and query-users,
# and view-clients is a composite role that also includes query-clients.
# We're including query-* roles explicitly for the sake of clarity.
# See `Clients -> realm-management -> Roles` in Keycloak admin panel for details.
required_roles="manage-users query-clients query-groups query-users view-clients view-realm view-users"
required_roles_json_array=$(jq --raw-input --compact-output 'split(" ")' <<< "$required_roles")

# The following steps can be done via admin panel
# under `Clients -> <client> -> Service Account Roles -> Client Roles -> realm-management (from dropdown)`.
echo -n "Obtaining missing roles required by the service account for realm-management client access... "
missing_required_roles=$(curl $curl_flags -X GET \
    ${keycloak_url}/admin/realms/${keycloak_realm}/users/${service_account_user_uuid}/role-mappings/clients/${realm_management_client_uuid}/available \
    -H "Authorization: Bearer $keycloak_access_token" \
  | jq 'map(select( [.name] | inside('$required_roles_json_array') )) | sort_by(.name)')

if [[ $missing_required_roles != '[]' ]]; then
  echo "$missing_required_roles" | jq -c 'map(.name)' | tr -d '"'
  echo "Granting all missing required roles..."
  curl $curl_flags -X POST \
      ${keycloak_url}/admin/realms/${keycloak_realm}/users/${service_account_user_uuid}/role-mappings/clients/${realm_management_client_uuid} \
      -H "Authorization: Bearer $keycloak_access_token" \
      -H 'Content-Type: application/json' \
      -d "$missing_required_roles"
else
  echo '<NONE>, all done already'
fi

echo 'Complete!'
