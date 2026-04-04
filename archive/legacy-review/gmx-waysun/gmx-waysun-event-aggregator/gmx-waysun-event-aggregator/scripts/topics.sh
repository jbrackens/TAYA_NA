#!/usr/bin/env bash
# Provide list of topics in format: "<TOPIC> >> <PARAMETERS>"
TOPICS=(
   "stella-messaging.default-aggregation-definition >> --replication-factor 3 --partitions 3 --config min.compaction.lag.ms=10000  --config cleanup.policy=compact --config delete.retention.ms=10000  --config segment.ms=10000 --config segment.bytes=104857600 --config min.cleanable.dirty.ratio=0.1"
   "stella-messaging.default-aggregation-control    >> --partitions 6 --replication-factor 3 --config retention.ms=3000000000"
   "stella-streaming.default-aggregation-aggregated             >> --partitions 6 --replication-factor 3 --config retention.ms=3000000000"
)

# Examples:
# ./topics.sh --exec kafka-topics.sh --zookeeper zookeeper.streaming
# ./topics.sh --zookeeper zookeeper.streaming --recreate

## ------------------------------------------------------------
set -eauo pipefail
function usage() {
  cat <<EOL
Usage $0:
  --zookeeper <address>           - Zookeeper address. Default: "${CFG_ZOOKEEPER}"
  --exec <kafka-topics.sh path>   - Path for "kafka-topics.sh", default: "./kafka-topics.sh"
  --recreate                      - Flag, when set, topics will be recreated

EOL
}

# Defaults:
CFG_ZOOKEEPER="localhost:2181"
KAFKA_CLI="kafka-topics.sh"
FORCE_RECREATE="false"

while [ "${#}" -gt 0 ] ; do
  case "${1}" in
    --zookeeper)
          shift
          CFG_ZOOKEEPER="${1}"
          ;;
    --exec)
          shift
          KAFKA_CLI="${1}"
          ;;
    --recreate)
          FORCE_RECREATE="true"
          ;;
    *)
          usage
          exit 255
          ;;
  esac
  shift
done

function topic.delete() {
  local TOPIC=${1}
  echo "deleting topic: '${TOPIC}"
  ${KAFKA_CLI} --zookeeper "${CFG_ZOOKEEPER}" --delete --topic "${TOPIC}"
  echo "done"
  echo
}


function topic.create() {
  local TOPIC=${1}
  shift
  echo "creating topic: '${TOPIC}'"
  echo "        params:  ${*}"
  ${KAFKA_CLI} --zookeeper "${CFG_ZOOKEEPER}" --create --topic "${TOPIC}" "${@}"
  echo "done"
  echo
}

function topic.exists() {
  local TOPIC=${1}
  local count
  count=$(${KAFKA_CLI} --zookeeper "${CFG_ZOOKEEPER}" --list --topic "${TOPIC}" | wc -l ) ||  exit 255
  [ "${count}" -eq 1 ]
}

function main() {
  for topic_definition in "${TOPICS[@]}" ; do
    local regex='([a-z0-9.-]*) *>> *(.+)'
    [[ ${topic_definition} =~ ${regex} ]] ||  (echo "wrong definition found - '${topic_definition}'" && exit 255)
    local topic="${BASH_REMATCH[1]}"
    local parameters="${BASH_REMATCH[2]}"
    if topic.exists "${topic}" ; then
      if [ "${FORCE_RECREATE}" = "true" ] ; then
        topic.delete "${topic}"
      else
        echo "skipping ${topic} - already exists"
        continue
      fi
    fi
    # unescaped ${parameters[@]} to pass it as array not a whole-space-limited string
    topic.create "${topic}" ${parameters[@]}
  done
}

main
