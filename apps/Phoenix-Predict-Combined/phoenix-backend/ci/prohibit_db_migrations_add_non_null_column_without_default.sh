#!/usr/bin/env bash

set -e -o pipefail -u

# Let's skip the migrations up to V21 since we can't do much about them at this point...
if find services/src/main/resources/db/migration/ -type f \
    | sort -V \
    | grep -Ev '/V(.|1.|21)_' \
    | xargs grep -in 'ADD COLUMN .* NOT NULL;'; then

  echo -e '\nAdding a non-nullable column is a questionable idea. This migration will fail if there are any rows in the migrated table.'
  echo -e '\nConsider specifying a DEFAULT, or adding the column as nullable, filling up the nulls and only then altering to non-nullable.'
  exit 1;
fi
