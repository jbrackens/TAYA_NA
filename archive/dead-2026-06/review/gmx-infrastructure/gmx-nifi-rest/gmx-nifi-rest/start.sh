#!/usr/bin/env bash

set -e
cd /app
export PYTHONPATH=/app:$PYTHONPATH

if [[ ${DEBUG} = 'TRUE' ]]; then
    uvicorn gmx_nifi_rest.main:app --reload --log-level debug --host 0.0.0.0 &
else
    gunicorn -b 0.0.0.0:8000 -w4 -k uvicorn.workers.UvicornWorker gmx_nifi_rest.main:app &
fi


echo $! > /tmp/uvicorn.pid
trap "kill $(cat /tmp/uvicorn.pid)" SIGINT
wait $(cat /tmp/uvicorn.pid)
