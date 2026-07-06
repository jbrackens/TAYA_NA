#!/bin/bash

set -e -o pipefail -u

if ! [[ ${GITHUB_TOKEN-} ]]; then
  echo "Provide 'GITHUB_TOKEN' env var containing a Personal Access Token with the 'repo - Full control of private repositories' scope that gives permission to open a release PR"
  echo "See https://github.com/settings/tokens"
  exit 1
fi

version=$(<VERSION.txt)
branch_name="release/$(date +"%Y-%m-%d_%H-%M")"

echo "Pulling the latest code to both 'master' and 'develop'..."
git checkout master
git pull
git checkout develop
git pull

echo -e "\nCreating branch '$branch_name' out of 'develop' and pushing to the remote repository..."
git checkout -b $branch_name
git push --set-upstream origin $branch_name

pr_description=$(git cherry -v master $branch_name | cut -c 44-)

request_body=$(
  jq --null-input \
    --arg base "master" \
    --arg head "$branch_name" \
    --arg title "Release v$version" \
    --arg body $'```\n'"$pr_description"$'\n```' \
    --argjson draft true \
    '$ARGS.named'
)

echo
echo

curl --fail --location --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "User-Agent: script" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/flipadmin/phoenix-backend/pulls \
  -d "$request_body" \
| jq -r .html_url

echo
echo

echo "Follow the above link to see the release PR."
echo "Remember to fast-forward-merge the PR and NOT use the Github merge button!"
