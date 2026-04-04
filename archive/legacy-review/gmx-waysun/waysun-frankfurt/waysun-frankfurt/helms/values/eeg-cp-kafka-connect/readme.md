## Installation

### Develop:
```shell
helm upgrade --install cp-kafka-connect waysun-dev-stella/eeg-cp-kafka-connect --namespace streaming -f default.yaml -f develop.yaml
```

### Prod:
```shell
helm upgrade --install cp-kafka-connect waysun-dev-stella/eeg-cp-kafka-connect --namespace streaming -f default.yam -f production.yaml
```


