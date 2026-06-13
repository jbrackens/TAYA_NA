#!/usr/bin/env bash

set -e -o pipefail -u

# See .sqlfluff and .sqlfluffignore for the configuration.
sqlfluff lint services/src/main/resources/db/migration/
