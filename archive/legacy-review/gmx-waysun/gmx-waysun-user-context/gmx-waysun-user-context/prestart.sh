#!/usr/bin/env bash
set -e
echo Pre start script

echo "## Migrations "
echo "##"
python -m "user_context.migrations.run"

