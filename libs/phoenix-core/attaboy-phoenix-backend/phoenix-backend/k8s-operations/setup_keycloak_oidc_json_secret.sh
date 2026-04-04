#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 5 ]]; then
  echo "Usage: $(basename $0) <phoenix-backend-namespace> <keycloak-namespace> <keycloak-url> <keycloak-realm> <keycloak-client>"
  echo
  echo "Example (from k8s):   $(basename $0) phoenix keycloak https://keycloak.keycloak:8443/     phoenix phoenix-backend"
  echo "Example (from local): $(basename $0) phoenix keycloak https://localhost:8443/             phoenix phoenix-backend"
  exit 1
fi

phoenix_backend_namespace=$1
keycloak_namespace=$2
keycloak_url=${3%/}/auth
keycloak_realm=$4
keycloak_client=$5

curl_flags="--fail --insecure --silent --show-error -HAccept:application/json -HCache-Control:no-cache"

echo 'Obtaining Keycloak admin password...'
keycloak_admin_password=$(kubectl get secret -n "$keycloak_namespace" credential-keycloak -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d)

while true; do
  echo 'Obtaining Keycloak access token...'
  keycloak_access_token=$(curl $curl_flags -X POST \
    ${keycloak_url}/realms/master/protocol/openid-connect/token \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "grant_type=password&username=admin&password=${keycloak_admin_password}&client_id=admin-cli" |
    jq -r '.access_token')

  echo "Obtaining $keycloak_client client UUID..."
  if keycloak_client_uuid=$(curl $curl_flags -X GET \
    ${keycloak_url}/admin/realms/${keycloak_realm}/clients?clientId=${keycloak_client} \
    -H "Authorization: Bearer $keycloak_access_token" |
    jq -r '.[0].id'); then
    if [[ "$keycloak_client_uuid" != "null" ]]; then
      break
    else
      echo 'Client not ready yet, sleeping 5 seconds...'
      sleep 5
    fi
  else
    echo 'Realm not ready yet, sleeping 5 seconds...'
    sleep 5
  fi
done

keycloak_client_uuid=$(curl $curl_flags -X GET \
  ${keycloak_url}/admin/realms/${keycloak_realm}/clients?clientId=${keycloak_client} \
  -H "Authorization: Bearer $keycloak_access_token" |
  jq -r '.[0].id')

# The following step can be done via admin panel
# under `Clients -> (client name) -> Installation tab -> Keycloak OIDC JSON (from dropdown)`.
echo "Obtaining OIDC JSON for $keycloak_client client..."
keycloak_oidc_json_base64=$(curl $curl_flags -X GET \
  ${keycloak_url}/admin/realms/${keycloak_realm}/clients/${keycloak_client_uuid}/installation/providers/keycloak-oidc-keycloak-json \
  -H "Authorization: Bearer $keycloak_access_token" |
  jq '."auth-server-url" = "https://keycloak.'$keycloak_namespace':8443/auth/"' |
  jq '."verify-token-audience" = false' |
  base64 --wrap=0)

echo "Setting up 'keycloak-config-backend' secret in '$phoenix_backend_namespace' namespace..."
kubectl apply -n "$phoenix_backend_namespace" -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: keycloak-config-backend
type: Opaque
data:
  "keycloak.json": "${keycloak_oidc_json_base64}"
EOF
