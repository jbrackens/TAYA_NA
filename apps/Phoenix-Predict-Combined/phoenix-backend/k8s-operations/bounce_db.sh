#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 2 ]]; then
  echo "Usage: $(basename $0) <k8s-cluster-id> <k8s-namespace-name>"
  echo
  echo "         $(basename $0) eks-virginia-dev phoenix"
  exit 1
fi

cluster=$1
namespace=$2
values_file=deploy/helm/phoenix-backend/envs/${cluster}_${namespace}.yaml

[[ ${CI-} = true ]] || {
  echo 'This script is only ever supposed to be executed from within the CI, not from developer machines.'
  exit 1
}

./k8s-operations/ensure_k8s_cluster.sh $cluster
./k8s-operations/ensure_k8s_namespace.sh $namespace

function y() {
  document=$1
  expression=$2
  echo "$document" | yq eval "$expression" -
}


function helm_template() {
  hook_base_name=$1
  # Passing a values file is necessary here even if NO values are actually referenced from the given template;
  # the reason is that Helm always renders all templates in the chart
  # (some of which won't render properly without a complete set of values defined),
  # even if `--show-only` is specified.
  helm template --show-only "templates/hook-*-$hook_base_name.yaml" --values $values_file deploy/helm/phoenix-backend
}

function extract_secret_key() {
  secret=$1
  key=$2
  kubectl get secret "$secret" -o jsonpath="{.data.$key}" | base64 -d
}

db_migration_pod_yaml=$(helm_template db-migration-pod)

function db_migration_pod_env_var() {
  env_var=$1
  env_var_pod_def=$(y "$db_migration_pod_yaml" '.spec.containers[0].env[] | select(.name == "'$env_var'")')
  secret_key_value=$(y "$env_var_pod_def" .value)
  if [[ $secret_key_value != "null" ]]; then
    echo "$secret_key_value"
  else
    extract_secret_key "$(y "$env_var_pod_def" .valueFrom.secretKeyRef.name)" "$(y "$env_var_pod_def" .valueFrom.secretKeyRef.key)"
  fi
}


echo -e '\nExtracting database credentials...'

postgres_host=$(db_migration_pod_env_var FLYWAY_DATABASE_HOST)
postgres_database=$(db_migration_pod_env_var FLYWAY_DATABASE_NAME)
postgres_superuser=postgres
postgres_superuser_password=$(kubectl get secret -n postgres-operator postgres.phoenix-cluster.credentials.postgresql -o jsonpath='{.data.password}' | base64 -d)

echo -e '\nRecreating the "public" schema...'

# Note that regardless of what $namespace we're operating on,
# we're still using a stateless `psql` pod living in `default` namespace.
# This is deliberate, we don't need a separate `psql` pod in each namespace,
# just one such pod in the cluster is enough for the needs of all namespaces.
if ! kubectl get pod psql -n default &>/dev/null; then
  # POSTGRES_PASSWORD is required to run the pod. The actual password will be provided on per-`kubectl exec` basis.
  kubectl run psql --image=postgres:13.4 --env POSTGRES_PASSWORD=password -n default
fi

function pod_ready() {
  local namespace pod_name status
  namespace=$1
  pod_name=$2
  status=$(kubectl get pods -n "$namespace" -o jsonpath='{ .items[?(@.metadata.name == "'$pod_name'")].status.conditions[?(@.type == "Ready")].status }')
  [[ $status == True ]]
}

until pod_ready default psql; do
  echo 'Waiting for `psql` pod to start...'
  sleep 3
done

sql='DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC'
kubectl exec -n default psql -- \
  bash -c "PGPASSWORD='$postgres_superuser_password' psql -U '$postgres_superuser' -h '$postgres_host' -d '$postgres_database' -c '$sql'"


echo -e '\nRunning Flyway migrations...'

kubectl delete configmap db-migration 2>/dev/null || true
kubectl delete pod       db-migration 2>/dev/null || true

helm_template db-migration-configmap | kubectl create -f -

# A conversion from YAML to JSON is needed since `helm template` can only render YAML,
# while `--overrides` only accepts JSON :(
overrides=$(echo "$db_migration_pod_yaml" | ./k8s-operations/yaml_to_json.sh)

# Passing `--image` is required even though the same information is included in the rendered `--overrides`...
# just an idiosyncrasy of the `kubectl run` CLI :/
image=$(jq -r '.spec.containers[0].image' <<< "$overrides")

# The combination of `--attach=true` and `--restart=Never` is necessary so that `kubectl run` behaves like `docker run`:
# 1. (more obviously) attaches to stdout of the container
# 2. (less obviously) exits with container's exit code if it fails (and not with 0)
kubectl run flyway \
  --attach=true --restart=Never --rm \
  --image="$image" \
  --overrides="$overrides"
