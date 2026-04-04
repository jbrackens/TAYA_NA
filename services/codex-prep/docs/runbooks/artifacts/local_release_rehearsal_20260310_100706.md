# Local Release Rehearsal

- Generated: 2026-03-10T10:07:06+01:00
- Root: /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
- Skip overlays: 0
- Skip docker: 1
- Skip compose: 0

## Validate Kubernetes Overlays

```bash
/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/validate_k8s_overlays.sh 
```

==> validating overlay: local
==> validating overlay: staging
==> validating overlay: production
overlay validation passed

Result: PASS

## Run Compose Integration

```bash
/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/scripts/run_compose_integration.sh 
```

unable to get image 'confluentinc/cp-kafka:7.6.0': permission denied while trying to connect to the Docker daemon socket at unix:///Users/johnb/.docker/run/docker.sock: Get "http://%2FUsers%2Fjohnb%2F.docker%2Frun%2Fdocker.sock/v1.51/images/confluentinc/cp-kafka:7.6.0/json": dial unix /Users/johnb/.docker/run/docker.sock: connect: operation not permitted

Result: FAIL

