#!/usr/bin/env bash

set -e -o pipefail -u
set -x

git fetch --tags

version=$(<VERSION.txt)

tag="v$version"
echo "Tagging current commit with $tag"

if git tag "$tag"; then
  git push origin "$tag"
else
  echo -e "Tag $tag already exists "
  head_commit=$(git rev-parse HEAD)
  tag_commit=$(git rev-parse "$tag")
  if [[ $head_commit == "$tag_commit" ]]; then
    echo "but points to the same commit as HEAD ($head_commit), ignoring"
  else
    echo "and points to a different commit ($tag_commit) than HEAD ($head_commit), aborting"
    exit 1
  fi
fi
