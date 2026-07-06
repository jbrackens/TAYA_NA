#!/bin/bash
# Wrapper script to work around filesystem constraints preventing yarn from unlinking files
# This script runs yarn install in a clean temp directory and copies results back

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR="/tmp/yarn-install-$$"
trap "rm -rf $TEMP_DIR" EXIT

# Copy package.json to temp location
mkdir -p "$TEMP_DIR"
cp "$SCRIPT_DIR/package.json" "$TEMP_DIR/"
[ -f "$SCRIPT_DIR/yarn.lock" ] && cp "$SCRIPT_DIR/yarn.lock" "$TEMP_DIR/"

# Run yarn install in temp directory
cd "$TEMP_DIR"
PATH="$HOME/.local/bin:$PATH" yarn install "$@"

# Check if successful
if [ $? -eq 0 ]; then
    # Copy node_modules back, handling the filesystem restriction
    cd "$SCRIPT_DIR"
    if [ -d node_modules ]; then
        mv node_modules node_modules.old.$$
    fi
    cp -r "$TEMP_DIR/node_modules" "$SCRIPT_DIR/"
    [ -f "$TEMP_DIR/yarn.lock" ] && cp "$TEMP_DIR/yarn.lock" "$SCRIPT_DIR/"
    echo "✓ yarn install completed successfully"
    echo "✓ node_modules installed to $SCRIPT_DIR/node_modules"
    exit 0
else
    echo "✗ yarn install failed"
    exit 1
fi
