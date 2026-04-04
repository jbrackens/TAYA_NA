#!/bin/sh

set -e
cd /app

if [ -f provision.sh ] ; then
    echo '#####'
    echo '## Provisioning scripts:'
    . provision.sh
    echo '####'
    echo 'Done.'
fi
export PYTHONPATH=/app:$PYTHONPATH
python3 /tmp/start_bjoern.py
