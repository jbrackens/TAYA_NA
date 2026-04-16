#!/usr/bin/env bash

set -e -u

# SLF4J's has a detectLoggerNameMismatch feature (https://www.slf4j.org/codes.html#loggerNameMismatch),
# but this only works in the runtime (not during the build), and even then only results in an easy-to-miss warning.

# Note that this check cannot be easily implemented with ArchUnit without heavy hacking; rather, a Scala compiler plugin would be necessary.
# Let's instead go for a lightweight approximate implementation in a shell script.

exit_code=0
for file in $(git ls-files '*.scala'); do
  # (?<=...) and (?=...) are lookarounds, available in grep's Perl syntax.
  grep --perl-regexp --only-matching '(?<=LoggerFactory\.getLogger\().*(?=\))' "$file" | while read -r logger_for; do
    case $logger_for in
      getClass) ;;
      this.getClass) ;;
      this.objectName) ;;
      *)
        echo "$file: logger for '$logger_for' is used - please use a logger for 'getClass' or 'this.objectName' (import phoenix.core.ScalaObjectUtils._) to avoid potential logger/class mismatches"
        exit_code=1
    esac
  done
done
exit $exit_code