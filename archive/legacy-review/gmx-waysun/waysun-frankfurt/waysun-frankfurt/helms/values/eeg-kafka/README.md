
```shell
helm upgrade --install \
     kafka waysun-dev-stella/eeg-kafka \
     --namespace streaming \
     -f default.yaml \
     -f develop.yaml
```
