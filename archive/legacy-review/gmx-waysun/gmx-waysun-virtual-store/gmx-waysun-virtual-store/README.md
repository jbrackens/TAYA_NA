# gmx-waysun-virtual-store
Waysun project Virtual Store

## Some info
 - add this `"credsStore": "osxkeychain"` to `~/.docker/config.json` 
 - add this to `vim .git/hooks/pre-commit` (remember to add execute permissions!)
   ```shell script
   #!/usr/bin/env bash
   export PATH=/Library/Frameworks/Python.framework/Versions/3.8/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
   set -e
   pipenv run ./lint.sh check
   ```