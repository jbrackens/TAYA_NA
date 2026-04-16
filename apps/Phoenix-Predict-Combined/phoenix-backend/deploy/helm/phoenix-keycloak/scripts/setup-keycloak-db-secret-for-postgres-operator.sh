#!/bin/env bash

set -e -o pipefail -u

if [[ $# -ne 3 ]]; then
  echo "Usage: $(basename $0) <db-name> <db-host> <db-owner-secret-name>"
  echo
  echo "Example: $(basename $0) keycloak phoenix-cluster.postgres-operator.svc.cluster.local keycloak-owner-user.phoenix-cluster.credentials.postgresql"
  exit 1
fi

db_name=$1
db_host=$2
db_owner_secret_name=$3

echo 'Obtaining Postgres credentials...'
db_password_base64=$(kubectl get secret "$db_owner_secret_name" -o jsonpath='{.data.password}')
db_username_base64=$(kubectl get secret "$db_owner_secret_name" -o jsonpath='{.data.username}')

echo 'Saving keycloak-db-secret...'
kubectl apply -f- <<EOF
kind: Secret
apiVersion: v1
metadata:
  name: keycloak-db-secret
type: Opaque
stringData:
  POSTGRES_DATABASE:         '$db_name'
  POSTGRES_EXTERNAL_ADDRESS: '$db_host'
  POSTGRES_EXTERNAL_PORT:    '5432'
  POSTGRES_HOST:             '$db_host'
  POSTGRES_SUPERUSER:        'false'
data:
  POSTGRES_PASSWORD:         '$db_password_base64'
  POSTGRES_USERNAME:         '$db_username_base64'
EOF

echo 'Complete!'
