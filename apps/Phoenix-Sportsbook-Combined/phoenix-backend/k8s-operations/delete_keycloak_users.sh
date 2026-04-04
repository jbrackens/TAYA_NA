#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 2 ]]; then
  echo "Usage: $(basename $0) <keycloak-k8s-namespace> <realm>"
  echo
  echo "Example: $(basename $0) keycloak phoenix"
  exit 1
fi

keycloak_namespace=$1
keycloak_realm=$2

# We can pass `--insecure` since the communication happens within localhost.
curl_flags="--fail --insecure --ipv4 --silent --show-error -HAccept:application/json -HCache-Control:no-cache"

echo -e '\nSetting up port forwarding to Keycloak API...'

kubectl port-forward -n "$keycloak_namespace" svc/keycloak 8443:8443 &>kubectl-port-forward-keycloak.log &

port_forwarder_pid=$!
# shellcheck disable=SC2064
trap "echo -e '\nKilling port-forward process...'; kill $port_forwarder_pid" EXIT

keycloak_url=https://localhost:8443/auth

until curl -XOPTIONS $curl_flags $keycloak_url &>/dev/null; do
  echo 'Port forwarding not ready yet, waiting 1 second...'
  sleep 1
done

echo -e '\nObtaining Keycloak admin password...'
keycloak_admin_password=$(kubectl get secret -n "$keycloak_namespace" credential-keycloak -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d)

while true; do
  echo -e '\nObtaining Keycloak access token...'
  keycloak_access_token=$(curl $curl_flags -X POST \
    "${keycloak_url}/realms/master/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "grant_type=password&username=admin&password=$keycloak_admin_password&client_id=admin-cli" \
  | jq -r '.access_token')

  echo -ne '\nCounting remaining users... '
  user_count=$(curl $curl_flags -X GET \
    "${keycloak_url}/admin/realms/${keycloak_realm}/users/count" \
    -H "Authorization: Bearer $keycloak_access_token")

  echo "$user_count user(s) left"
  if [[ $user_count -eq 0 ]]; then
    break
  fi

  # The token is very short-lived, let's only take a few users at once to finish before it expires
  echo -e '\nObtaining user ids...'
  user_ids=$(curl $curl_flags -X GET \
    "${keycloak_url}/admin/realms/${keycloak_realm}/users?max=10" \
    -H "Authorization: Bearer $keycloak_access_token" \
  | jq -r '.[] | .id')

  for user_id in $user_ids; do
    echo -ne "\nDeleting user with id: $user_id... "
    curl $curl_flags -X DELETE \
      "${keycloak_url}/admin/realms/${keycloak_realm}/users/$user_id" \
      -H "Authorization: Bearer $keycloak_access_token"
    echo OK
  done
done
