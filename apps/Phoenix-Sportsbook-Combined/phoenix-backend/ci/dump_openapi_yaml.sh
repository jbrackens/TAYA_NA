#!/usr/bin/env bash

set -e -o pipefail -u

# Let's identify the JVM process explicitly instead of relying on `$!` (most recent job PID).
# The latter approach doesn't work as expected since sbt launcher (which corresponds to `$!`)
# spawns a separate `java` process which is not getting killed together with the launcher.
function is_sbt_swagger_running() {
  jps -ml | grep --quiet 'phoenix-backend/runMain phoenix.main.Swagger'
}

function kill_sbt_swagger() {
  signal=$1
  jps -ml | grep 'phoenix-backend/runMain phoenix.main.Swagger' | cut -d' ' -f1 | xargs -l kill -$signal 2>/dev/null || true
}

output=$1
rm -f "$output"
# Let's pass a syntactically valid Keycloak client JSON (even if the credentials aren't correct),
# so that the application is able to start and print Swagger yaml.
KEYCLOAK_CLIENT_CONF_LOCATION=$(pwd)/dev/keycloak/keycloak.json PHOENIX_ODDIN_DATA_INGESTION_ENABLED=no sbt "phoenix-backend/runMain phoenix.main.Swagger $(pwd)/$output" &

trap "kill_sbt_swagger KILL" EXIT

for ((i=0; i<90; i++)); do
  if [[ -f "$output" ]]; then break; fi
  sleep 2
done

kill_sbt_swagger TERM

for ((i=0; i<10; i++)); do
  if ! is_sbt_swagger_running; then break; fi
  sleep 2
done

if ! [[ -f "$output" ]]; then
  echo "File $output has NOT been written by sbt" >&2
  exit 1
fi
