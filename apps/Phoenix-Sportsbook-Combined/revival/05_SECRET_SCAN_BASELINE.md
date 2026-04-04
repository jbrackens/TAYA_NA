# Secret Scan Baseline (2026-03-02)

## Scope
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice`
- `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`

## Method
- Scanner: local regex baseline using `git grep` on tracked files.
- High-confidence credential patterns were scanned first (private keys, AWS keys, GitHub PATs, Slack tokens).
- Credential-like literals were additionally scanned and classified as:
  - `candidate`
  - `env_placeholder`
  - `dev_fixture`
  - `test_fixture`

## Results Summary
- Total findings: **14**
- Critical pattern hits: **0**
- Medium pattern hits: **1**
- Low pattern hits: **13**
- Candidate findings requiring remediation: **0**
- Fixture-only findings: **5**
- Placeholder-only findings: **8**
- Documentation command findings: **1**

## Key Outcome
- No high-confidence production secret material was detected in tracked files.
- One known local dev credential fixture exists in:
  - `phoenix-backend/dev/keycloak/users/local/passwords_local.yaml` (`fixedPassword: 'Password123!'`).
- Remaining non-fixture hits are environment-variable placeholders in scripts or documentation commands that reference secret retrieval.

## Artifacts
- Detailed findings CSV: `revival/05_secret_scan_findings.csv`
