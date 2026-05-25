# Demo deployment

## Current live branch

The Hetzner demo deploys from `feat/binary-exchange-engine`.

Do not deploy `main` to the demo box until `main` and the live feature branch
are reconciled. `main` can contain newer isolated work while still missing
features that are already live on the demo server.

## Safe integration flow

1. Branch from `origin/feat/binary-exchange-engine`.
2. Port the intended commits into that branch.
3. Run the cashier and gateway/frontend verification commands.
4. Push the integration branch.
5. Manually dispatch `Deploy demo (Hetzner)` from that integration branch.
6. After verification, merge the integration branch back into the chosen long
   term base.

The deploy workflow has a branch allowlist to prevent accidental `main`
deploys. Update that allowlist only when intentionally retargeting the live
demo.

## Smoke checks

```sh
curl -sS -D - -o /tmp/demo-api.txt --max-time 20 \
  'https://demo.99rtp.io/api/v1/markets?limit=1'

curl -sS -D - -o /tmp/demo-root.html --max-time 20 \
  'https://demo.99rtp.io/'

curl -sS -D - -o /tmp/office-root.html --max-time 20 \
  'https://office.99rtp.io/'
```

Expected results:

- `demo.99rtp.io/api/v1/markets?limit=1` returns `200`.
- `demo.99rtp.io/` returns `200`.
- `office.99rtp.io/` returns `401 Basic` unless operator credentials are
  supplied.
