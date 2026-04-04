#!/usr/bin/env bash

set -e -o pipefail -u

git grep --files-with-matches 'START doctoc' -- '*.md' | while read -r file; do
  doctoc "$file"
  if [[ ${JENKINS_URL-} ]]; then
    # https://github.com/thlorenz/doctoc/issues/188 open for some kind of `--check` flag in `doctoc` instead
    if ! git diff --exit-code HEAD -- "$file"; then
      echo
      echo "Table of contents in the above file is not up to date. Use \`doctoc $file\` to rectify, then commit and push the changes."
      exit 1
    fi
  fi
done

# Let's not fail a develop/master build if one of the linked websites happens to be down.
if [[ ${BRANCH_NAME-} = develop ]] || [[ ${BRANCH_NAME-} = master ]]; then
  rc_path=.remarkrc-allow-dead-urls.yml
else
  rc_path=.remarkrc.yml
fi
remark --frail --ignore-path=.gitignore --rc-path=$rc_path .
