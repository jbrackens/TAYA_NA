#!/usr/bin/env bash

# To run directly against Elastic Stack in k8s, execute:
# $ kubectl exec -n elastic svc/elasticsearch-master -- bash -c "$(<k8s-operations/setup_elk.sh)"

# Note that this script needs to be idempotent to safely handle possible re-runs.

set -euo pipefail

curl_flags="--fail --location --silent --show-error"

until curl $curl_flags http://phoenix-elastic-kibana:5601/api/status >/dev/null; do
  echo 'Kibana is not ready yet, sleeping 5 seconds...'
  sleep 5
done

echo 'Updating filebeat index pattern in Kibana'

# This is a POST, but thanks to `"override": true` it's still idempotent.
curl $curl_flags -XPOST \
     -H 'Content-Type: application/json' \
     -H 'kbn-xsrf: true' \
     http://phoenix-elastic-kibana:5601/api/index_patterns/index_pattern \
     -d '
{
  "index_pattern": {
    "title": "filebeat-*",
    "timeFieldName": "@timestamp"
  },
  "override": true
}' >/dev/null


until curl $curl_flags http://elasticsearch-master:9200/_cluster/health >/dev/null; do
  echo 'Elasticsearch is not ready yet, sleeping 5 seconds...'
  sleep 5
done

echo
echo 'Updating Index Lifecycle Management policy in Elasticsearch'

curl $curl_flags -XPUT \
     -H 'Content-Type: application/json' \
     -H 'kbn-xsrf: true' \
     http://elasticsearch-master:9200/_ilm/policy/filebeat \
     -d '
{
  "policy": {
    "_meta": {
      "description": "Automatic rollover of filebeat logs",
      "project": {
        "name": "filebeat"
      }
    },
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "5GB"
          }
        }
      },
      "warm": {
        "min_age": "2d",
        "actions": {
          "readonly": {},
          "migrate": {},
          "shrink" : {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "7d",
        "actions": {
          "readonly": {},
          "migrate": {}
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}' >/dev/null


echo
echo 'Updating filebeat index template in Elasticsearch'

curl $curl_flags -XPUT \
     -H 'Content-Type: application/json' \
     http://elasticsearch-master:9200/_index_template/filebeat \
     -d '
{
  "index_patterns": ["filebeat-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "filebeat"
    }
  }
}' >/dev/null
