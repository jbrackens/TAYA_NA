# Archived documentation

Files under `docs/archive/` are historical records of finished or superseded work —
kept for the reasoning they contain, not as descriptions of the current system. If
anything here disagrees with the code or the root-level docs (`CLAUDE.md`,
`DESIGN.md`, `PRODUCT-USER-JOURNEYS.md`), the code and root docs win.

Every archived file opens with a banner saying when and why it was archived.

## Why documents get archived instead of deleted

A finished plan is still useful as a record of *why* a decision was made. The danger
is not that these documents exist — it is that they read as live instructions. Moving
them here, with a banner, keeps the reasoning while removing the ambiguity.

Documents that record nothing worth keeping — reviews of plans never executed, guides
to packages never built — are deleted outright rather than archived.

## Contents

| Path | What it holds |
|---|---|
| `2026-07-rebrand/` | The TapTrade rebrand ledger (`CURRENT_STATE`, `WORKLOG`, `RENAME_MAP`). The rebrand shipped and merged in July 2026. |
| `2026-07-launch-prep/` | Launch-preparation records superseded by the points-only launch, including the Parity RC v1 spec and its loop log. |
| `2026-07-parity-loop/` | The parity and prototype-audit loop logs. The loop stopped 2026-07-01; the trees it audited were deleted 2026-09-06. |
| `cashier/` | The custodial and non-custodial cashier and crypto-rail workstream, abandoned when the product moved to non-redeemable points. |
| `chat/` | Rocket.Chat launch records. The demo compose still runs a Rocket.Chat stack, but the player-side integration shipped only as a flag-gated stub (`ChatSidebar` with mock messages), so the runbook and evidence here never went live. |
| `never-built/` | Specs for features that were never implemented (the prediction-markets filter-bar PRD). |
| `demo-deployment/` | Manual demo-deploy plans from before deployment was automated in GitHub Actions. |
| `sportsbook-era/` | Planning inherited from the Taya Na Sportsbook fork that assumes a sports-betting domain. |
| `phoenix-original/` | The March 2026 founding Phoenix architecture documents, predating the prediction-market pivot. One is an AI build-plan for a sportsbook — read that directory's README first. |
| `FRONTEND_POLISH_PLAN.md` | The P0–P5 frontend polish program, completed July 2026. Kept flat because code comments cite it by this path. |
