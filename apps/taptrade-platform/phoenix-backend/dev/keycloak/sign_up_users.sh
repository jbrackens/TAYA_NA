#!/bin/bash

set -e -o pipefail -u

if [[ $# -ge 2 ]]; then
  echo "Usage: $(basename $0) [<subdirectory=local>]"
  echo
  echo "Example: $(basename $0)"
  echo "Example: $(basename $0) other"
  exit 1
fi

export DEV_ROUTES_USERNAME=dev
export DEV_ROUTES_PASSWORD=dev
export PHOENIX_API_ROUTE="http://localhost:13551"
export PHOENIX_DEV_ROUTE="http://localhost:12551"

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null || exit; pwd -P)

subdirectory="local"
if [[ $# -eq 1 ]]; then
  subdirectory="$1"
fi

keycloak_realm=$(jq -r .realm "$script_dir"/keycloak.json)
keycloak_url=$(jq -r '."auth-server-url"' "$script_dir"/keycloak.json)
keycloak_url=${keycloak_url%/}
export KEYCLOAK_ADMIN_PASSWORD="admin"

"$script_dir"/sign_up_users_loop.sh "$subdirectory" "$keycloak_realm" "$keycloak_url"
