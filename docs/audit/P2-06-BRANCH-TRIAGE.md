# P2-06 — Branch Triage & Mainline Consolidation (owner-decision report)

> **RESOLVED 2026-06-14 — this report describes a decision that has since been executed. Do not run anything in it.**
> The deploy line was promoted to `main`; `feat/binary-exchange-engine` no longer exists on the remote; `.github/workflows/deploy-demo.yml` triggers on `push: branches: [main]` with the inline note "P2-06: consolidated onto main; feat/binary-exchange-engine retired 2026-06-14". `CLAUDE.md` records the same outcome. Of the ~20 branches §6 listed for pruning, only `feat/hula-na-cashier` still exists on the remote.
> **§3 (the force-push execution sequence) has been deleted** rather than left in place — it contained a `git push --force-with-lease ... refs/heads/main` against the production trunk, seeded from a ref that no longer resolves. §6's prune list is kept only as a record of what was triaged; it is not a to-do list.

**Status:** executed. Written 2026-06-14 as an owner-decision report; independently reviewed by Codex (verdict: endorse-with-changes, folded in).
**Generated:** 2026-06-14, during the autonomous IMPROVEMENT_PLAN loop.
**Deploy line at the time of writing:** `origin/feat/binary-exchange-engine` @ `52e0af06` — then the branch `deploy-demo.yml` shipped to Hetzner (demo.99rtp.io / office.99rtp.io). It is `main` now.

---

## 1. The situation (verified) — `main` didn't just go stale, it DIVERGED

- `main` @ `a6efaafe` (2026-05-25), `origin/main == local main`. **GitHub's default branch is already `main`.**
- Deploy line @ `52e0af06` carries all of Phase 1–3 + this session's work and is what's live.
- `git rev-list --left-right --count main...origin/feat/binary-exchange-engine` = **35  416**: 35 commits unique to `main`, **416** unique to the deploy line. Common ancestor `0a2241b9` (2026-05-09).

So they forked ~5 weeks ago and both grew. `main`'s 35 unique commits are **not junk**: 8 `deploy/ci` fixes + ~22 commits of an **earlier cashier scaffold** (the `feat/hula-na-cashier` merge: a BSC-USDT deposit watcher under `internal/.../gateway/internal/payments`, a minimal EVM JSON-RPC client, exactly-once credit, USDT↔cents). The deploy line has a **later, more complete** cashier — `internal/alphacashier/` (+`internal/cashier/`) — and commit `b7063824` on the deploy line **explicitly removed the legacy watcher** when the rail was reworked. The deploy fixes are superseded by the deploy line's own working `deploy-demo.yml` (shipped ~2 dozen times this week).

---

## 2. Recommendation — ADOPT the deploy line as `main` (don't merge)

Make `main` take on the deploy line's history; archive the old `main` as a tag (nothing lost). Concretely: the deploy line *becomes* `main`.

**Why not a real merge:** the lines diverged 35/416 — not a fast-forward. A 3-way merge would fight the deliberate cashier replacement (re-introducing the removed BSC-USDT watcher next to `alphacashier`) and produce a misleading merge commit. **Why not `git branch -m`/rename:** the local `feat/binary-exchange-engine` is checked out (stale) in the `-cashier` worktree and can't be moved; a remote rename is create/delete choreography that doesn't solve workflow retargeting or protection. **Why not "keep shipping from feat forever":** leaves a misleading branch name, a frozen default branch, and no protected trunk.

---

## 3. Execution sequence — REMOVED

The step-by-step promotion runbook that stood here has been deleted. It has already been carried out, and what it contained — a `--force-with-lease` push to `refs/heads/main`, seeded from `git rev-parse origin/feat/binary-exchange-engine` — would now fail at the seed step and, if adapted, would rewrite the production trunk. The shape of what was done is recorded in §2 (adopt the deploy line as `main`, keep the old tip as an archive tag) and the outcome is visible in `deploy-demo.yml`.

---

## 4. The one decision that was genuinely the owner's — cashier rail

*Resolved by events: the launch is points-only and both rails are retired. `cmd/gateway/main.go` refuses to boot with `ALPHA_CASHIER_ENABLED=true` or the legacy money routes in production/staging. Nothing here needs cherry-picking.*

The deploy line's `alphacashier` **replaced** `main`'s earlier BSC-USDT deposit-watcher scaffold (`internal/payments/{deposit_watcher,evm_rpc,usdt_conversion,crypto_deposits}.go`), and commit `b7063824` deliberately removed that watcher. Risk of dropping something **live** is low (`main` isn't deployed). The real question is **product intent**: confirm the current `alphacashier` rail supersedes the BSC-USDT scaffold before abandoning those ~22 commits. At the time, the open question was whether to cherry-pick any of those ~22 commits onto the deploy line before the promotion. They were not cherry-picked.

---

## 5. Branch protection status (as verified on 2026-06-14) + what was to be set after

*Not re-verified. Branch protection is a GitHub setting, not repo content — check the repository settings rather than trusting this section.*

- `main`: **not protected** · `feat/binary-exchange-engine`: **not protected** · default branch: **`main`**.
- → That is why the promotion could be pushed directly, with no admin override.
- → It also meant the trunk had **zero guardrails**, part of why P2-06 existed. The follow-up was to protect `main`: require a PR plus green required checks (G-02/G-03/G-04/Tests) and block force-pushes. **Whether that was ever applied is not recorded here and cannot be read from the repository — check the GitHub branch-protection settings.**

---

## 6. Branch cleanup (as triaged on 2026-06-14 — historical, not a to-do list)

*Superseded. The remote now carries only `main`, `feat/hula-na-cashier`, `feat/predict-redesign-p10`, `pam/p0-modernization` and in-flight agent branches. Every branch named below other than `feat/hula-na-cashier` is already gone. Nothing here needs pruning.*


**Merged into the deploy line — safe to prune** (`git branch -d <name>`; `-d` refuses any not actually merged):
```
phase2/ci-guardrails  phase2/ledger-adr  phase2/office-guards  phase2/wallet-ctx
phase2/wallet-ctx-sweep  phase3/audit-gdpr  phase3/audit-immutability
phase3/jurisdiction-form  phase3/observability  phase3/p2-08-formatters
phase3/partner-admin  phase3/partner-api  phase3/per-market-jurisdiction
phase3/white-label  phase3/webhooks  fix/p1-correctness-security
feat/antd-v5  chore/safe-brand-text-cleanup
```
**KEEP despite "merged":** `phase3/tenancy-spike` (`2d927739`, owner-paused P3-01 epic bookmark); `phase3/settlement-batching` (`81a29ad4` — memory references a possibly-dangling P3-12-core commit `~6f4f1a51`; verify before deleting; P3-12 core is unfinished).
**KEEP — snapshots:** `archive/2026-06-pre-cleanup`, `backup/pre-deploy-1a6ef06f`.
**Stale local trunk:** local `feat/binary-exchange-engine` = `b748b440`, **69 commits behind** origin — re-point or delete after promotion.
**Older Apr–May branches (NOT merged — owner to triage with product context):** `feat/social-oauth`, `feat/social-oauth-deploy-wiring`, `feat/ai-market-drafting`, `feat/risk-dashboard-v1`, `feat/ws-redis-pubsub`, `feat/gateway-rate-limiting`, `feat/office-prediction-tables-mono`, `feat/office-p8-{foundation,app-router-sweep,pages-router-cleanup}`, `chore/office-p8-final-stragglers`, `chore/office-cleanup-dormant-theme`, `chore/replace-skipped-marketcard-test`, `docs/archive-design-sportsbook`, `docs/design-md-office-p8-decision`, `fix/player-app-node-tests`, `fix/qa-cms-feature-flag`, `fix/qa-logs-remove-sportsbook-fields`, `deploy-chat-room`, `feat/hula-na-cashier` (ties to the `-cashier` worktree — don't prune without checking it).

---

## 7. What this unblocked

`main` became the trunk and the deploy source. **P3-11** landed: `.github/workflows/e2e.yml` runs the end-to-end journey suite on pull requests to `main` against a freshly seeded stack.
