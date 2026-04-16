#!/bin/bash

set -e -o pipefail -u

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename $0) <k8s-cluster-alias=[eks-](virginia-dev|outpost-stg|outpost-prd)>"
  echo
  echo "Example: $(basename $0) virginia-dev"
  exit 1
fi

function die() {
  echo "$@"
  exit 1
}

cluster_alias=${1#eks-}
# Let's identify the cluster by its server, as there is no other more unambiguous field
# (in particular, the name of cluster/context may be different depending on the machine where this script is executed).
case $cluster_alias in
  virginia-dev) cluster_server=https://4BFC443F3A58851F4BCFDBC6EBB05135.gr7.us-east-1.eks.amazonaws.com ;;
  outpost-stg)  cluster_server=https://171203B3CBE4F1FBFA03629FF1180622.gr7.us-east-1.eks.amazonaws.com ;;
  outpost-prd)  cluster_server=https://56158D2837D9DE83B3615BCF2E97202D.gr7.us-east-1.eks.amazonaws.com ;;
  *)            die "Unknown cluster alias: $cluster_alias"
esac

target_cluster_name=$(kubectl config view -o json \
  | jq -r '[.clusters[] | select(.cluster.server == "'$cluster_server'")][0].name')
[[ "$target_cluster_name" != "null" ]] || die "No cluster with server $cluster_server corresponding to $cluster_alias found"

current_cluster_name=$(kubectl config view --minify -o jsonpath='{.contexts[0].context.cluster}')

if [[ $current_cluster_name != "$target_cluster_name" ]]; then
  echo "Switching to '$target_cluster_name' cluster..."

  target_context_name=$(kubectl config view -o json \
    | jq -r '[.contexts[] | select(.context.cluster == "'$target_cluster_name'")][0].name')
  [[ $target_cluster_name ]] || die "No context corresponds to cluster $target_cluster_name"

  kubectl config use-context "$target_context_name"
else
  echo "Already at '$target_cluster_name' cluster"
fi
