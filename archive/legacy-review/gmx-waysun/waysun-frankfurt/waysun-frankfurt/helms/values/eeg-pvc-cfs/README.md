
```shell
helm upgrade --install \
     streaming-pvc waysun-dev-stella/eeg-pvc-cfs \
     --namespace streaming \
     -f default.yaml \
     -f develop.yaml
```
