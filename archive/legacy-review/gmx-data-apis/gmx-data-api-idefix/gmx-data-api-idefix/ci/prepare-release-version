#!/usr/bin/env bash

set -e -o pipefail -u
export RELEASE_VERSION_SEGMENT_TO_UPDATE=$1 # One of: major, minor, patch
export TMP_VERSION_FILE=$(mktemp)
sbt -Drelease=$RELEASE_VERSION_SEGMENT_TO_UPDATE "writeVersion $TMP_VERSION_FILE"
export RELEASE_VERSION="v$(cat $TMP_VERSION_FILE)"
# Create local tag in order to enforce sbt to create a real release instead of just a snapshot release
git tag $RELEASE_VERSION