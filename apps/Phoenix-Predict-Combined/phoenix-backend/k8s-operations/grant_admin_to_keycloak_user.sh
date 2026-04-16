#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 3 ]]; then
  echo "Usage: $(basename "$0") <keycloak-realm> <keycloak-url> <username>"
  echo
  echo "Example: $(basename "$0") phoenix https://localhost:8443/auth plipski-test"
  exit 1
fi

if [[ -z ${KEYCLOAK_ADMIN_PASSWORD-} ]]; then
  echo "Required environment variable 'KEYCLOAK_ADMIN_PASSWORD' is missing"
  exit 1
fi

keycloak_realm=$1
keycloak_url=$2
username=$3

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null || exit; pwd -P)
"$script_dir"/grant_roles_to_keycloak_user.sh "$keycloak_realm" "$keycloak_url" "$username" admin
