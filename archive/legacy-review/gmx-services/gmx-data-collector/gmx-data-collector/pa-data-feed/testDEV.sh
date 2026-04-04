#!/usr/bin/env bash
curl -X POST -H "Content-Type: application/octet-stream" -k \
--data-binary "@test.sh" \
https://data-collector.dev.gmx.flipsports.net/data/test.sh

curl -X POST -H "Content-Type: application/octet-stream" -k \
--data-binary "@src/test/resources/camel/b20180111ncs17050003.xml" \
https://data-collector.dev.gmx.flipsports.net/data/b20180111ncs17050003.xml

curl -X POST -H "Content-Type: application/octet-stream" -k \
--data-binary "@src/test/resources/camel/c20180111ncs.xml" \
https://data-collector.dev.gmx.flipsports.net/data/c20180111ncs.xml

curl -X POST -H "Content-Type: application/octet-stream" \
--data-binary "@src/test/resources/camel/s110118.tgz" \
https://data-collector.dev.gmx.flipsports.net/data/s110118.tgz
