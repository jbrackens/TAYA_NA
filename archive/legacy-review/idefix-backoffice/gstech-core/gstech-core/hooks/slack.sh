#!/bin/bash -e
username=$1
text=$2
fields="${3:-[]}"
color="${4:-good}"
json="{
    'channel': '#development-updates',
    'icon_emoji': ':earth_africa:',
    'username': '$username',
    'text': '$text',
    'color': '$color',
    'fields': $fields
    }"

curl -X POST -H 'Content-type: application/json' --data "$json" https://hooks.slack.com/services/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