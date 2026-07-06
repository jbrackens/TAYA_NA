#!/bin/bash

set -e -o pipefail -u

function random_number() {
  min=$1
  max=$2
  if command -v shuf &>/dev/null; then
    cmd=shuf
  elif command -v gshuf &>/dev/null; then
    cmd=gshuf
  else
    echo 'Neither `shuf` nor `gshuf` has been found. Make sure that `coreutils` package is installed!'
    exit 1
  fi
  $cmd -i "$min"-"$max" -n 1
}

if [[ $# -lt 9 || $# -gt 10 ]]; then
  echo "Usage: $0 <keycloak_realm> <keycloak_url> <username> <email> <first-name> <last-name> <balance> <phone-number> <admin=true|false> [<roles-csv>]"
  exit 1
fi

keycloak_realm=$1
keycloak_url=$2
username=$3
email=$4
first_name=$5
last_name=$6
balance=$7
phone_number=$8
admin=$9
roles_csv=${10-}


if [[ -z ${DEV_ROUTES_USERNAME-} ]]; then
  echo "Required environment variable 'DEV_ROUTES_USERNAME' is missing"
  exit 1
fi

if [[ -z ${DEV_ROUTES_PASSWORD-} ]]; then
  echo "Required environment variable 'DEV_ROUTES_PASSWORD' is missing"
  exit 1
fi

if [[ -z ${PHOENIX_API_ROUTE-} ]]; then
  echo "Required environment variable 'PHOENIX_API_ROUTE' is missing"
  exit 1
fi

if [[ -z ${PHOENIX_DEV_ROUTE-} ]]; then
  echo "Required environment variable 'PHOENIX_DEV_ROUTE' is missing"
  exit 1
fi

if [[ -z ${USER_PASSWORD-} ]]; then
  echo "Required environment variable 'USER_PASSWORD' is missing"
  exit 1
fi

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null || exit; pwd -P)

api_root=$PHOENIX_API_ROUTE
dev_routes_api_root=$PHOENIX_DEV_ROUTE
password=$USER_PASSWORD

sign_up_request_body=$(cat <<EOF
{
  "name": {
    "title": "Mr/Ms",
    "firstName": "${first_name}",
    "lastName": "${last_name}"
  },
  "username": "${username}",
  "password": "${password}",
  "email": "${email}",
  "phoneNumber": "${phone_number}",
  "address": {
    "addressLine": "Raritan Road Unit F4B, 1255",
    "city": "Clark",
    "state": "NJ",
    "zipcode": "07001",
    "country": "US"
  },
  "dateOfBirth": {
    "day": $(random_number 1 28),
    "month": $(random_number 1 12),
    "year": $(random_number 1920 1999)
  },
  "ssn": "$(random_number 100000000 999999999)"
}
EOF
)

curl_flags="--fail --ipv4 --location --silent --show-error -HContent-Type:application/json"
echo "Creating account for [username = $username]"
curl $curl_flags -d "${sign_up_request_body}" -u "$DEV_ROUTES_USERNAME":"$DEV_ROUTES_PASSWORD"  "$dev_routes_api_root"/test-account-sign-up
echo "Account created"


declare -a requested_roles=()

if [[ -n "$roles_csv" ]]; then
  while IFS= read -r role_name; do
    if [[ -n "$role_name" ]]; then
      requested_roles+=("$role_name")
    fi
  done < <(tr ',' '\n' <<< "$roles_csv")
fi

if [[ $admin = true ]]; then
  requested_roles+=("admin")
fi

if [[ ${#requested_roles[@]} -gt 0 ]]; then
  deduped_roles=()
  while IFS= read -r role_name; do
    if [[ -n "$role_name" ]]; then
      deduped_roles+=("$role_name")
    fi
  done < <(printf '%s\n' "${requested_roles[@]}" | awk 'NF && !seen[$0]++')
  requested_roles=("${deduped_roles[@]}")
  "$script_dir"/grant_roles_to_keycloak_user.sh "$keycloak_realm" "$keycloak_url" "$username" "${requested_roles[@]}"
fi


if [[ $balance -eq 0 ]]; then
  echo 'Skipped crediting funds since the desired initial balance is zero'
  exit
fi

login_request_body=$(cat <<EOF
{
  "username": "$username",
  "password": "$password"
}
EOF
)
echo "Logging in as [username = $username]"
login_response=$(curl $curl_flags -d "${login_request_body}" "$api_root"/login)
echo "Logged in"
user_id=$(echo "$login_response" | jq -r '.token.userId')

make_deposit_request_body=$(cat <<EOF
{
  "details": "Deposited by the registration script",
  "amount": {
    "amount": $balance,
    "currency": "USD"
  }
}
EOF
)
echo "Crediting funds for [username = $username, user_id = $user_id, amount = $balance]"
curl $curl_flags -d "${make_deposit_request_body}" -u "$DEV_ROUTES_USERNAME":"$DEV_ROUTES_PASSWORD" "$dev_routes_api_root"/punters/"$user_id"/funds/credit > /dev/null
echo "Credit succeeded"
