#!/bin/bash

set -e -o pipefail -u

[[ ${BRANCH_NAME-} == master ]] || {
  echo 'This script is only supposed to execute in the CI, and only for master branch builds, aborting'
  exit 1
}

set -x
# Let's fetch the most recent commit pointed by `develop` in case some new changes has been pushed since `checkout scm` step.
# We don't need to do the same for `master` - even if new commits have been pushed to `master` since `checkout scm` step,
# a subsequent build for `master` should pick up those changes and merge them to `develop` accordingly.
# Note that builds for `master` are executed sequentially (`disableConcurrentBuilds()`),
# so there is NO risk of race conditions between two executions of this script.
git fetch origin +refs/heads/develop:refs/remotes/origin/develop
# 'checkout scm' performed by Jenkins does NOT create any local branches,
# and as a consequence leaves the repository in detached HEAD state (even though we're building a branch, namely `master`).
# `yarn version-and-publish:stage` release, in turn, checks out `master` branch, so we only need to check out `develop` explicitly now.
git checkout -b develop origin/develop
git branch -v --all  # for diagnostic purposes

git merge master || {
  set +x
  echo 'The script failed to cleanly merge `master` (updated by `lerna`) to `develop`.'
  echo 'This means that some recent commits on `develop` introduced changes conflicting with the current state of `master`.'
  echo 'Please create a pull request from `master` to `develop` manually to make sure that the version bumps done by lerna on `master` are also reflected on `develop`.'
  echo 'Otherwise, the package versions recorded in `develop` commit will lag behind the versions recorded in `master` commit, which is an erroneous state.'
  exit 1
}
git push origin develop:develop
git branch -v --all
