#!/bin/bash

set -e

./k8s-operations/ensure_command_available.sh yq 'https://github.com/mikefarah/yq#install' '4.'

yq eval --prettyPrint --tojson -
