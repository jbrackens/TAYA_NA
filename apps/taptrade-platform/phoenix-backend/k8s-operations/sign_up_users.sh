#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 1 ]]; then

cat<<EOF
Usage: $(basename $0) <cluster>

The users will be taken from all the files matching 'users/users_<cluster>_*.yaml' path glob.
For each such 'users/users_<cluster>_<group>.yaml' yaml file,
a matching file called 'users/passwords_<cluster>_<group>.yaml' must exists.
Depending on the top-level key in that file:

* 'fixedPassword':
  The provided password will be used literally.
  Recommended for local setup.

* 'takePasswordFrom':
  'op' 1Password CLI will retrieve the password from the given 1Password 'vault'->'itemTitle'.
  Recommended for dev environments.

* 'savePasswordsUnder':
  'op' 1Password CLI will autogenerate a separate (individual) password for each created user
  and store it under the given 'vault'->('itemTitlePrefix'+username).
  Recommended for (pre-)production environments.

Example: $(basename $0) virginia-dev
Example: $(basename $0) outpost-stg
Example: $(basename $0) outpost-prd

EOF
exit 1

fi

./k8s-operations/ensure_command_available.sh jq 'https://stedolan.github.io/jq/download/'       '1.'
./k8s-operations/ensure_command_available.sh op 'https://1password.com/downloads/command-line/' '2.'
./k8s-operations/ensure_command_available.sh yq 'https://github.com/mikefarah/yq#install'       '4.'

cluster=$1
phoenix_namespace=phoenix
keycloak_namespace=keycloak
keycloak_realm=phoenix

if [[ $cluster = *-prd ]]; then
  echo "About to create users on PRODUCTION environment."
  echo "Have you followed https://eegtech.atlassian.net/wiki/spaces/GMX3/pages/10292953119/NJDGE+-+Procedure+-+Test+Account+Management+Procedure?"
  echo -n "Type YES to proceed: "
  read -r answer
  [[ $answer == YES ]] || exit 1
fi

./k8s-operations/ensure_k8s_cluster.sh "$cluster"

function extract_secret_key() {
  key=$1
  kubectl -n $phoenix_namespace get secret phoenix-backend-secrets -o jsonpath="{.data.$key}" | base64 -d
}

DEV_ROUTES_USERNAME=$(extract_secret_key dev-routes-username)
export DEV_ROUTES_USERNAME

DEV_ROUTES_PASSWORD=$(extract_secret_key dev-routes-password)
export DEV_ROUTES_PASSWORD


function get_url_for_service_port() {
  port_name=$1
  # In plain English, let's extract host and path that correspond to the given service port,
  # with the trailing regex (nginx)/glob (ALB) removed.
  #
  # Using two different paths for port to cater for two Ingress API versions:
  #   - .service.port.name -> networking.k8s.io/v1
  #   - .servicePort       -> networking.k8s.io/v1beta1
  url=$(kubectl -n $phoenix_namespace get ingress phoenix-backend -o json 2>/dev/null \
    | jq -r '.spec.rules[] | "https://" + .host + (
      .http.paths[]
        | select(.backend.service.port.name == "'$port_name'" or .backend.servicePort == "'$port_name'")
        | .path
        | rtrimstr("/(.*)")
        | rtrimstr("/*")
      )')

  if [[ $url ]]; then
    echo "URL for port $port_name is $url" >&2
    echo $url
  else
    echo "No URL found for port $port_name in phoenix-backend ingress!" >&2
    return 1
  fi
}

PHOENIX_API_ROUTE=$(get_url_for_service_port public-api)
export PHOENIX_API_ROUTE

function close_k8s_tunnel() {
  local k8s_namespace k8s_service port_forwarder_pid
  k8s_namespace=$1
  k8s_service=$2
  port_forwarder_pid=$3

  echo -e "\nKilling port-forward process for service $k8s_namespace/$k8s_service..."
  kill "$port_forwarder_pid" || true
}

function add_exit_trap() {
  local current_trap
  current_trap=$(trap -p EXIT | cut -d"'" -f2)
  # shellcheck disable=SC2064
  trap "${current_trap}$*; " EXIT
}

function open_k8s_tunnel() {
  local maybe_option protocol k8s_namespace k8s_service local_port k8s_port_name

  maybe_option=$1
  if [[ $maybe_option == "--https" ]]; then
    protocol=https
    shift
  else
    protocol=http
  fi

  k8s_namespace=$1
  k8s_service=$2
  local_port=$3
  k8s_port_name=$4
  check_url=$5

  if nc -z localhost "$local_port" &>/dev/null; then
    echo "Port $local_port is already bound - is there a tunnel to service $k8s_namespace/$k8s_service running?"
    echo "Aborting to avoid confusion (esp. if whatever occupies port $local_port is NOT service:port $k8s_namespace/$k8s_service:$k8s_port_name)."
    exit 1
  fi

  echo -e "\nSetting up port forwarding to service:port $k8s_namespace/$k8s_service:$k8s_port_name..."

  k8s_port=$(kubectl get service -n "$k8s_namespace" "$k8s_service" -o jsonpath='{ .spec.ports[?(@.name == "'$k8s_port_name'")].port }')
  kubectl port-forward -n "$k8s_namespace" "svc/$k8s_service" "$local_port:$k8s_port" &>"kubectl-port-forward-$k8s_namespace-$k8s_service.log" &

  port_forwarder_pid=$!
  add_exit_trap "close_k8s_tunnel $k8s_namespace $k8s_service $port_forwarder_pid"

  # We can pass `--insecure` since the communication within port-forward is secured on lower level anyway.
  until curl --fail --insecure --ipv4 --silent --show-error "${protocol}://localhost:${local_port}${check_url}" &>/dev/null; do
    echo "Port forwarding to service:port $k8s_namespace/$k8s_service:$k8s_port not ready yet, waiting 1 second..."
    sleep 1
  done
}

open_k8s_tunnel --https "$keycloak_namespace" keycloak        8443 keycloak /auth
keycloak_url=https://localhost:8443/auth

open_k8s_tunnel         "$phoenix_namespace"  phoenix-backend 9001 dev-api  /docs/docs.yaml
export PHOENIX_DEV_ROUTE=http://localhost:9001


echo -e '\nObtaining Keycloak admin password...'
keycloak_admin_password=$(kubectl get secret -n "$keycloak_namespace" credential-keycloak -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d)
export KEYCLOAK_ADMIN_PASSWORD="$keycloak_admin_password"


script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null || exit; pwd -P)

"$script_dir"/sign_up_users_loop.sh "$cluster" "$keycloak_realm" "$keycloak_url"
