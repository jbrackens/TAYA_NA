
**important `--raw` switch!**

```shell
yaml_helper.sh replace_secrets  --raw secrets/develop.env secret.ytpl .secret.yaml 
```

```shell
helm upgrade --install \
     nifi waysun-dev-stella/eeg-nifi \
     --namespace processing \
     -f default.yaml \
     -f develop.yaml \
     -f .secret.yaml 
```