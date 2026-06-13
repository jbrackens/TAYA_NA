# gmx-oidc

## Some info
 - add this `"credsStore": "osxkeychain"` to `~/.docker/config.json` 
 - add this to `vim .git/hooks/pre-commit` (remember to add execute permissions!)
   ```shell script
   #!/usr/bin/env bash
   export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
   set -e
   pipenv run ./lint.sh check
   ```
 - `sudo ifconfig lo0 alias 192.168.XX.1 255.255.255.0`
 - add `local.darkstormlabs` to `/etc/hosts` as `192.168.XX.1`
 