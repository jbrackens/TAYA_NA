#!/bin/bash

set -e
cd /app

if [[ -f ./provision.sh ]] ; then
    echo '#####'
    echo '## Provisioning scripts:'
    . ./provision.sh
    echo '####'
    echo 'Done.'
fi
export PYTHONPATH=/app:$PYTHONPATH
CPU_COUNT=${GUNICORN_CPU_COUNT:-$(lscpu -b -p=Core,Socket | grep -v '^#' | sort -u | wc -l)}
WORKERS_COUNT=$((2*CPU_COUNT+1))

echo '#####'
echo "## Starting gunicorn with ${WORKERS_COUNT} workers count"
gunicorn -b :8080 -w ${WORKERS_COUNT} --threads 1 --timeout ${GUNICORN_TIMEOUT:-300} project.wsgi:application
