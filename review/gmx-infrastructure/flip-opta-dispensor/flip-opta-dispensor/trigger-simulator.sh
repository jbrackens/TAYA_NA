#!/bin/bash

curl -X POST -H "Content-Type: application/json" -d '{
    "sport_id": 1,
    "start_date": "2016-04-29 11:25:00",
    "end_date": "2016-04-29 13:50:05",
    "end_point": "http://optafiledrop.flipsports.net:9000/opta",
    "job_id": "test",
    "all_at_once": false,
    "step_multiplier": 0.1
}' 'http://ec2-52-51-43-234.eu-west-1.compute.amazonaws.com:8400/feed_api'

date "+%H:%M:%S   %d/%m/%y"
