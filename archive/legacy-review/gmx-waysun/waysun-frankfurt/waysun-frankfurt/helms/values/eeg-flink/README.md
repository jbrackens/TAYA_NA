
```shell
helm upgrade --install \
     flink waysun-dev-stella/eeg-flink \
     --namespace streaming \
     -f default.yaml \
     -f develop.yaml
```
