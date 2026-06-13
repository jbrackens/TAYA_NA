#!/usr/bin/env bash

this_file=$0
# Find fixmes/todos in comments NOT followed by an issue number
# (?!...) is negative lookahead, requires Perl syntax
if git grep --perl-regexp -I --ignore-case --line-number '(\*|//|#|<!--).*(fixme|todo)(?! \((DO|IHD|PHXD)-[0-9]+\):)' -- ":(exclude)$this_file"; then
  echo
  echo "Use 'TODO|FIXME (DO|IHD|PHXD-<issue-number>): <short-description>' format for the above TODOs and FIXMEs"
  exit 1
fi
