# P2-06 — Branch Triage & Mainline Consolidation (owner-decision report)

**Status:** analysis complete + **independently reviewed by Codex** (verdict: endorse-with-changes, folded in below). All history-rewriting actions remain **owner-gated** and are NOT auto-executed — they rewrite shared history and change what is deployed.
**Generated:** 2026-06-14, during the autonomous IMPROVEMENT_PLAN loop; revised after the Codex review.
**Deploy line (de-facto mainline):** `origin/feat/binary-exchange-engine` @ `52e0af06` — the branch `deploy-demo.yml` ships to Hetzner (live at demo.99rtp.io / office.99rtp.io).

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

## 3. Execution sequence (Codex-hardened; reversible at every step)

> Run from the **main worktree only** (`/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`). Use **direct refspecs** — never move the local `feat/binary-exchange-engine` ref (it's checked out stale in `-cashier`). **`main` is unprotected** (verified — see §5), so the `--force-with-lease` promote works directly; no admin override needed.

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict
git fetch origin
old_main=$(git rev-parse origin/main)                          # a6efaafe
deploy_tip=$(git rev-parse origin/feat/binary-exchange-engine) # 52e0af06

# Step 1 — Safety net: archive both tips, push (everything recoverable hereafter)
git tag -a archive/main-2026-05-25 "$old_main" -m "main before mainline adoption"
git tag -a archive/deploy-pre-mainline "$deploy_tip" -m "deploy line before mainline adoption"
git push origin refs/tags/archive/main-2026-05-25 refs/tags/archive/deploy-pre-mainline

# Step 2 — DUAL-BRANCH DEPLOY FIRST (the key fix): teach the workflow about main
#   BEFORE promoting, so a main-triggered deploy can't be silently refused.
#   deploy-demo.yml gates on branch == feat/binary-exchange-engine AND a
#   DEMO_DEPLOY_BRANCH_ALLOWLIST. Add 'main' to BOTH, ship via the still-live feat branch, smoke it.
git switch -c chore/mainline-retarget "$deploy_tip"
#   edit .github/workflows/deploy-demo.yml: branches:[...,main] + allowlist += main
git commit -am "ci(deploy): allow demo deploys from main during mainline promotion"
new_tip=$(git rev-parse HEAD)
git push origin HEAD:refs/heads/feat/binary-exchange-engine
gh workflow run deploy-demo.yml --ref feat/binary-exchange-engine   # smoke #1 (still on feat)

# Step 3 — Promote: force-with-lease main to that exact commit, then smoke FROM main
git push --force-with-lease=main:"$old_main" origin "$new_tip":refs/heads/main
gh workflow run deploy-demo.yml --ref main                          # smoke #2 (from main)

# Step 4 — ONLY after the main deploy is green: narrow workflow to main-only,
#   add branch protection to main (require PR + green CI + block force-push),
#   retire feat/binary-exchange-engine, then prune the §6 merged branches.
```

**Do not delete `feat/binary-exchange-engine` until the main deploy is confirmed green** — it's the fastest rollback ref. **Rollback** (if needed) restores from the archive tags via `--force-with-lease`, then redeploys from feat.

**Continuity risks to watch** (Codex): the workflow branch-allowlist guard (Step 2 closes it); a partial mid-run deploy (auth/gateway/migrations/frontends recreate in sequence) — the deploy gates on `/healthz` so a failure is visible; keep feat as the rollback ref until smoke #2 passes.

---

## 4. The one decision that's genuinely yours — cashier rail

The deploy line's `alphacashier` **replaced** `main`'s earlier BSC-USDT deposit-watcher scaffold (`internal/payments/{deposit_watcher,evm_rpc,usdt_conversion,crypto_deposits}.go`), and commit `b7063824` deliberately removed that watcher. Risk of dropping something **live** is low (`main` isn't deployed). The real question is **product intent**: confirm the current `alphacashier` rail supersedes the BSC-USDT scaffold before abandoning those ~22 commits. If anything in the older scaffold is still wanted, cherry-pick those specific commits onto the deploy line **before** Step 3 (`git diff 0a2241b9..main -- .../internal/payments` shows exactly what they touched).

---

## 5. Branch protection status (verified) + what to set after

- `main`: **not protected** · `feat/binary-exchange-engine`: **not protected** · default branch: **`main`**.
- → The `--force-with-lease` promote in §3 works with no workaround.
- → But it also means the trunk currently has **zero guardrails** — part of why P2-06 exists. **Step 4 must add protection to `main`:** require a PR + green required checks (G-02/G-03/G-04/Tests), and block force-pushes, so the promoted trunk is safe going forward.

---

## 6. Branch cleanup (verified merge status)

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

## 7. What this unblocks
Once `main` is the protected trunk + deploy source: **G-05** (CI on every PR) and **P3-11** (E2E on PRs to main) both clear, and the staging/prod pipeline (**P3-08**) has a real branch to target.
