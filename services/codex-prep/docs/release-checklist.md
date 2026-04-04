# Release Checklist

## Pre-release

- [ ] run the local rehearsal script and archive the report:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/release/rehearse_local_release.sh`
  - latest passing artifact:
    `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/local_release_rehearsal_20260310_114608.md`
- [ ] update image tags in:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/production`
- [ ] confirm `.env.production.example` reflects current runtime requirements
- [ ] run `go test ./...` in changed services
- [ ] run `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verify_docker_builds.sh`
- [ ] run compose integration:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/scripts/run_compose_integration.sh`

## Staging

- [ ] render staging manifests
- [ ] deploy staging overlay
- [ ] verify gateway `/health` and `/ready`
- [ ] verify user registration/login
- [ ] verify wallet create/deposit
- [ ] verify market creation and bet placement
- [ ] verify settlement batch and reconciliation paths
- [ ] verify CMS/content routes
- [ ] verify outbox worker drains backlog

## Production gate

- [ ] staging sign-off recorded
- [ ] rollback path identified for changed services
- [ ] previous image tags recorded
- [ ] database migration review complete
- [ ] on-call owner assigned for release window

## Production release

- [ ] apply production overlay
- [ ] confirm rollout status for:
  - gateway
  - user
  - wallet
  - market-engine
  - betting-engine
  - settlement
  - outbox worker
- [ ] verify smoke tests on live routes
- [ ] verify unpublished outbox backlog is normal

## Post-release

- [ ] capture deployed image tags
- [ ] close release notes with timestamp
- [ ] log follow-up issues discovered during rollout
