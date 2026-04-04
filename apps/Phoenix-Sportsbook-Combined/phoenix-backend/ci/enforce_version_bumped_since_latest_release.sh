#!/usr/bin/env bash

set -e -o pipefail -u

git fetch --tags

latest_tag=$(git describe --tags --abbrev=0)
latest_tag_version=${latest_tag/v/}
current_version=$(<VERSION.txt)

if [[ "$(printf "$current_version\n$latest_tag_version" | sort --version-sort | tail -n 1)" == "$latest_tag_version" ]]; then
  # In case HEAD commit is identical to the latest tag, it's likely that a build that created the tag has just been restarted -
  # so we probably shouldn't fail it.
  if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "$latest_tag")" ]]; then
    echo "Please increment version in VERSION.txt after a release! Latest released version: $latest_tag_version"
    exit 1
  fi
fi
