#!/bin/bash
# file: propagate.sh

echo "Propagating latest core to '$1'"
cd "../$1"
git pull origin master
cd core/
git pull origin master
cd ..
git commit -m 'update core' core
git push origin HEAD:master
cd ../gstech-core