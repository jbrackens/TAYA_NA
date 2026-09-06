# CMS + Bonus Augmentation plan (archived)

> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Sportsbook-era planning written 2026-04-16, the day the repo was forked into a prediction market; it was superseded that same day and never executed.
> See `CLAUDE.md` for current architecture.

## What this was

A twelve-part plan (01–12) to extend the then-current sportsbook with CMS and bonus/campaign capability, reconstructed from a legacy EEG analysis.

## Why it is archived, not guidance

**Its code roots do not exist.** The plan grounds itself in `apps/TapTrade-Sportsbook-Combined/`, `services/codex-prep/` and `docs/legacy-analysis/`. None of the three is in the repo.

**Its facts about the platform are wrong.** `02-current-architecture.md` calls the product "a real-time sports betting platform", puts PostgreSQL on 5432 and Redis on 6379, and counts 10 migrations. The real ports are 5434 and 6380 — chosen deliberately to avoid colliding with the sportsbook containers (`apps/taptrade-platform/docker-compose.yml`) — and there are 56 migrations.

**Its target architecture is banned.** Files 03, 05, 07, 08 and especially `09-parlay-mechanics-plan.md` plan parlay and betslip mechanics. This is a prediction market: users hold positions and place orders. `CLAUDE.md` rule 2 forbids new code referencing `betslip`, `freebets`, `odds_boosts`, `sport_key`, `punter_bets` or `match_tracker`, and `scripts/check-conventions.sh` fails CI if those tokens reappear in the prediction packages or the player app.

Three files (06, 09, 12) already carried a per-file historical note. This banner covers the whole set; treat 01–12 the same way.

## What actually shipped in this space

Bonus/campaign and CMS capability exist in the gateway, built independently of this plan — do not read these documents as a description of them:

- `go-platform/services/gateway/internal/bonus/` (`models.go`, `repository.go`, `service.go`)
- `go-platform/services/gateway/internal/content/` (`models.go`, `service.go`)
- Migrations `011_campaigns_bonuses.sql`, `012_content.sql`, `042_bonus_money_constraints.sql`

Anything from 01–12 that is still wanted should be re-derived against that code and the points-only launch boundary in `docs/taptrade-economy-rules.md`, not lifted from these files.
