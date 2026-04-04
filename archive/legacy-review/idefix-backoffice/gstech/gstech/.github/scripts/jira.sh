#!/usr/bin/env bash

function get_issues {
  local this_tag="$GITHUB_REF_NAME"
  local prev_tag
  local merged_prs_commits
  local issues
  prev_tag="$(echo "$this_tag" | awk -Fv '/[0-9]+/{print "v"$NF-1}')"
  merged_prs_commits="$(git log --merges --pretty=format:"%s" "$prev_tag..$this_tag" | grep "Merge")"
  issues="$(echo "$merged_prs_commits" | grep -oE "IDXD-[[:digit:]]{1,}" | sort | uniq | sed 's/^\|$/"/g' |
    paste -sd, - |
    awk '{print "["$0"]"}' |
    jq -c '.')"

  if [[ $issues == "[]" ]]; then
    echo "::notice title=JIRA Issues::None"
  else
    echo "::notice title=JIRA Issues::$(echo "$issues" | jq -r '@sh' | sed "s/'//g")"
  fi

  echo "$issues" | awk '{print "JIRA_ISSUES="$0}' >>$GITHUB_ENV
}

function release_notes {
  cat | jq -csR 'gsub("\n"; "\\n")' | awk '{print "RELEASE_NOTES="$0}' >> $GITHUB_ENV
}

case $1 in
  issues)
    get_issues
    ;;
  notes)
    release_notes
    ;;
esac
