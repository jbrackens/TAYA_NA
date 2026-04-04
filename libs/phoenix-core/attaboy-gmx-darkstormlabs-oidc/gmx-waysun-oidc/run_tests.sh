#!/usr/bin/env bash
set -a
source local.env
set +a
cd src
pipenv run ./manage.py test
