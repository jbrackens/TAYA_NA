#!/bin/bash

set -e -o pipefail -u -x

# If there are no changes in application code since the latest invocation of `lerna publish`
# (e.g. the new changes are only related to Kubernetes or Jenkins),
# then `lerna` by default does NOT create a new commit and hence does NOT push anything to `develop`/`master`.
# To circumvent this limitation, and make sure that a new commit is always created.
# Let's bump an otherwise ignored `serial-number` field in package.json.

# Let's use `yq eval --tojson` since `jq` doesn't support in-place file updates.
yq eval --inplace --tojson '."serial-number" += 1' packages/app/package.json
git add packages/app/package.json
git commit -m "chore(deploy): bump serial number in package.json files to make sure lerna cuts off a new release"
