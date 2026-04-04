#!/usr/bin/env bash
set -e

cd /app
export PYTHONPATH=/app:$PYTHONPATH

# If there's a prestart.sh script in the /app directory or other path specified, run it before starting
PRE_START_PATH=${PRE_START_PATH:-/app/prestart.sh}
echo "Checking for script in $PRE_START_PATH"
if [ -f $PRE_START_PATH ] ; then
    echo "Running script $PRE_START_PATH"
    . "$PRE_START_PATH"
else
    echo "There is no script $PRE_START_PATH"
fi

exec gunicorn -k "gunicorn_conf.CustomUvicornWorker" -c "${GUNICORN_CONF}" "${GUNICORN_APP_MODULE}"
