#!/usr/bin/env bash
curl -X POST -H "Content-Type: application/octet-stream" \
--data-binary "@test.sh" \
http://dockerhost:8080/data/test.sh

curl -X POST -H "Content-Type: application/octet-stream" \
--data-binary "@src/test/resources/camel/b20180111ncs17050003.xml" \
http://dockerhost:8080/data/b20180111ncs17050003.xml

curl -X POST -H "Content-Type: application/octet-stream" \
--data-binary "@src/test/resources/camel/c20180111ncs.xml" \
http://dockerhost:8080/data/c20180111ncs.xml

curl -X POST -H "Content-Type: application/octet-stream" \
--data-binary "@src/test/resources/camel/s110118.tgz" \
http://dockerhost:8080/data/s110118.tgz
