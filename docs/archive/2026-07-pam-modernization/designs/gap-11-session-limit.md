> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# GAP-11 — Session (continuous-play-duration) limit — DESIGN NOTE / BLOCKED

**Spec:** PAM §13 Responsible Gaming; §32 Scenario 6.
**Status:** BLOCKED — needs a product/compliance decision (see Decision below). The loss limit half of GAP-11 is DONE (commits `090dd418`/`7a03b95d`/`2f1e22f7`/`e064d8eb`); this note covers the session-limit half.

## Requirement
A responsible-gaming session limit caps how long a player may **play continuously** before being made to stop (a mandatory break). Unlike deposit/bet/loss limits (amount caps), this is a **time** cap.

## Gap re-verification (2026-07-03, VERIFIED)
- The gateway order gate has **no session-start signal**. The shared `httpx` auth middleware puts only `userID`, `username`, and `role` into the request context (`modules/platform/transport/httpx/middleware.go:143-145`); there is no issued-at / login-time / session-id.
- Auth is validated by a call to the auth service (with a short cache); the JWT is not decoded into claims the gateway handlers can read.
- Even if the JWT `iat` were propagated, it **resets on token refresh** (rotating sessions), so `now - iat` measures time-since-last-refresh, not continuous session duration — a player who refreshes never trips the cap. Semantically wrong for this control.

⇒ The clean read-only-at-the-seam pattern used for the loss limit (read `prediction_payouts`) has **no equivalent** for session duration. This is why it is a design decision, not a mechanical slice.

## The core question
**What is a "session" for this limit, and where is it enforced?**

## Options
- **A — Auth-service enforcement (login-session semantics).** The auth service owns session lifecycle, so it tracks the durable original session start (surviving refresh) and refuses to refresh / forces re-authentication once continuous session age ≥ the cap. Semantically most correct ("you've been logged in and playing for N hours → take a break"). Cost: a change in the separate `services/auth` module + a way for auth to read the per-user RG session cap (which lives in the gateway DB) — cross-service coupling (auth reads a gateway table, or the cap is mirrored/synced). Also decides the action: block refresh vs force logout vs soft nudge.
- **B — Gateway activity-based session (RECOMMENDED).** Define a "play session" as continuous trading activity: track first-activity-time per user, reset after an idle gap (e.g. 30 min with no order). Enforce in the Postgres `CheckBetAllowed` (deny new orders once continuous-session minutes ≥ cap), exactly like the loss limit, reusing the existing `player_activity_log` (already written on each bet) as the activity source. Self-contained in the gateway compliance package; no auth-service coupling; launch-safe (back-office/RG control, no user money path). Trade-off: "session" = continuous activity window, an approximation of a login session (a logged-in-but-idle player isn't accumulating session time — which is arguably the RIGHT behavior for a *play*-time limit).
- **C — Propagate JWT `iat` to context + enforce `now - iat > cap`.** Simplest, but `iat` resets on refresh → wrong (see gap re-verification). **Rejected.**

## Recommendation
**Option B (gateway activity-based).** It mirrors the loss-limit architecture (store the cap in a `player_session_limits` table via ensureSchema; enforce read-only in `CheckBetAllowed`; surface on the restrictions endpoint + office Limits tab), keeps the control fully inside the gateway with no auth-service change, and is launch-safe. The one product decision it still needs is the **idle-reset timeout** (what gap ends a session) and confirmation that "play time" (activity-based), not "login time," is the intended semantics.

## Unblock criteria (human decision)
1. Session semantics: **activity-based** (Option B, recommended) vs **login-based** (Option A)?
2. If activity-based: the **idle-reset timeout** (e.g. 30 min) and the session-duration cap periods (per-day? absolute minutes?).
3. Enforcement action: **block new orders** (recommended, matches loss limit) vs force logout vs soft nudge.

Once (1)–(3) are answered, Option B is a ~2-3 slice build (store + `CheckBetAllowed` enforcement reading `player_activity_log` continuous-window + route/office display) directly paralleling the loss limit — no protected-core edit.
