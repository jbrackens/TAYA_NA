#!/usr/bin/env bash
# https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#force-deleting-cache-entries

gh extension install actions/gh-actions-cache

function clean_pr_caches {
  echo "Fetching list PR caches"
  prCacheKeys=$(gh actions-cache list --repo "$REPO" --limit 100 --key "$PR_KEY-" | cut -f 1)

  # Setting this to not fail the workflow while deleting cache keys.
  set +e

  echo "Deleting caches..."
  for k in $prCacheKeys; do gh actions-cache delete "$k" -R "$REPO" --confirm; done
  echo "Done"
}

case $1 in
pr)
  clean_pr_caches
  ;;
esac
