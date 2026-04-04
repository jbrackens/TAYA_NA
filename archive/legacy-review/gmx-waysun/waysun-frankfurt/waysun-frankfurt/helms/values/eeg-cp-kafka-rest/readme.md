## Installation

### Develop:
```shell
helm upgrade --install cp-kafka-rest waysun-dev-stella/eeg-cp-kafka-rest --namespace streaming -f default.yaml -f develop.yaml
```

### Prod:
```shell
helm upgrade --install cp-kafka-rest waysun-dev-stella/eeg-cp-kafka-rest --namespace streaming -f default.yam -f production.yaml
```


