## Installation
### Develop:
```shell
helm upgrade --install cp-schema-registry waysun-dev-stella/eeg-cp-schema-registry --namespace streaming -f default.yaml -f develop.yaml
```

### Prod:
```shell
helm upgrade --install cp-schema-registry waysun-dev-stella/eeg-cp-schema-registry --namespace streaming -f default.yaml -f production.yaml
```


