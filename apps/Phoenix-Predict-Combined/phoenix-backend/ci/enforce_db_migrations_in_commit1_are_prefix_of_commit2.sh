#!/usr/bin/env bash

set -e -o pipefail -u

if (( $# != 2 && $# != 3 )); then
  echo "Usage:"
  echo "$(basename $0) <revision1> <revision2> [<extra-error-message>]"
  echo
  echo "Example:"
  echo "$(basename $0) origin/develop HEAD"
  exit 1
fi

function list_migrations_in_commit() {
  revision=$1
  git ls-tree --name-only "$revision" services/src/main/resources/db/migration/ | xargs -L1 basename -s .sql | sort -V
}

revision1=$1
revision2=$2
extra_error_message=${3-}

# Let's save the output to a variable to capture the failures in function call.
migrations1=$(list_migrations_in_commit "$revision1")
migrations2=$(list_migrations_in_commit "$revision2")

# `tail` to skip the diff output headers.
migration_diff=$(diff -u <(echo "$migrations1") <(echo "$migrations2") | tail -n+3 || true)

# Here's how sample value of migration_diff would look like:
#   @@ -55,11 +55,11 @@
#   V14_0_0__Add_cancel_withdrawals_column_to_daily_wallet_summary_table
#   V14_1_0__Add_reporting_wallet_transactions_table
#   V15_0_0__Add_line_id_to_wallet_transactions_table
#  -V16_0_0__Drop_punter_sessions_history_table
#   V17_0_0__Update_hashed_ssns_table_rename_ssn_to_hashed_ssn_and_add_encrypted_ssn_and_rename_table_to_ssns
#   V18_0_0__Remove_old_snapshot_filed_from_snapshot_table
#   V18_0_1__Create_self_excluded_punters_table
#   V18_0_2__Alter_punter_bets_history_add_fixture_status
#   V18_0_3__Add_reporting_punters_table
#   V18_1_0__Enable_fuzzysearch
#  -V18_2_0__Add_dge_exclusion_list
#  +V18_2_1__Add_dge_exclusion_list
#  +V26_0_0__Drop_punter_sessions_history_table

function die() {
  echo
  echo "Migrations in '$revision1' are NOT a prefix of migrations in '$revision2'!"
  echo "$@"
  if [[ $extra_error_message ]]; then
    echo
    echo "$extra_error_message"
  fi
  echo
  echo "$migration_diff"
  exit 1
}

if [[ "$migration_diff" ]]; then
  # Let's see if there's any line removed (-) in the diff.
  if grep -q '^-' <<< "$migration_diff"; then
    die "'$revision2' removes certain DB migration(s) present in '$revision1':"
  fi

  # Let's see if in the part of the diff after the first added line (/^+/),
  # there's any line which has NOT been added (i.e. remains unchanged, since a removed line would have already been captured above).
  if sed '1,/^+/ d' <<< "$migration_diff" | grep -q '^[^+]'; then
    die "'$revision2' slides in migration(s) BEFORE the latest migration on '$revision1':"
  fi
fi
