#!/bin/sh

# We need HOST_MINIKUBE_INTERNAL env var in order to connect to Postgres running outside of minikube
if [[ -z "${HOST_MINIKUBE_INTERNAL}" ]]; then
  echo "HOST_MINIKUBE_INTERNAL is not set, i need this so i can connect to Postgres running outside Minikube, you can find it by..."
  echo "------------"
  echo "minikube ssh"
  echo "cat /etc/hosts"
  echo "------------"
  echo "Look for entry for 'host.minikube.internal'"
  exit 1
fi

# Create the kubernetes secrets this service requires
kubectl create secret generic user-service-secrets \
--from-literal=database-username="user_service" \
--from-literal=database-password="user_service" \
--from-literal=application-secret="$(openssl rand -hex 16)"

# Build the image to Minikube's docker registry
eval $(minikube docker-env)
sbt docker:publishLocal

# Grab the version # we just built
IMAGE_TAG=$(grep "^version = " users-api/target/scala-2.13/resource_managed/main/version.conf | cut -d'=' -f2 | tr -d '"' | tr -d '[:space:]')

echo "Deploying with --set databaseHost=${HOST_MINIKUBE_INTERNAL} --set image.tag=${IMAGE_TAG}"

# Deploy the Helm chart
helm install --generate-name --set databaseHost="${HOST_MINIKUBE_INTERNAL}" --set image.tag="${IMAGE_TAG}" deploy/helm/gmx-user-service


