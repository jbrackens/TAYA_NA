# P2-06 — Branch Triage & Mainline Consolidation (owner-decision report)

**Status:** executable analysis complete; all merge/delete/reset **actions are owner-gated** and intentionally NOT performed by the agent (they rewrite shared history and change what is deployed).
**Generated:** 2026-06-14, during the autonomous IMPROVEMENT_PLAN loop.
**Deploy line (de-facto mainline):** `origin/feat/binary-exchange-engine` @ `0fccff51` (the branch `deploy-demo.yml` ships to Hetzner).

---

## 1. The core decision (why P2-06 is owner-gated)

`main` is frozen at `a6efaafe` (2026-05-25). Every subsequent feature + the entire
Phase 1–3 audit remediation lives on **`feat/binary-exchange-engine`**, which is now
**68+ commits ahead of where `main`/local-feat last met** and is the branch actually
deployed. So the platform's real trunk is `feat/binary-exchange-engine`, not `main`.

**The decision only the owner can make:** the mainline-consolidation strategy —
- (A) fast-forward / merge `feat/binary-exchange-engine` → `main` and make `main` the trunk again, or
- (B) rename `feat/binary-exchange-engine` → `main` (retire the stale `main`), or
- (C) keep shipping from `feat/binary-exchange-engine` indefinitely and treat `main` as an archive.

This is load-bearing (it changes what CI/branch-protection/`deploy-demo.yml` target) and must not be auto-executed.

---

## 2. Local branches MERGED into the deploy line — safe-delete candidates

All 18 of this session's topic branches were pushed sequentially onto
`origin/feat/binary-exchange-engine`, so their tips are now ancestors of `0fccff51`
(verified via `git branch --merged origin/feat/binary-exchange-engine`). Their work is
fully in the deploy line; the local branches are just bookmarks and can be pruned:

```
phase2/ci-guardrails  phase2/ledger-adr  phase2/office-guards  phase2/wallet-ctx
phase2/wallet-ctx-sweep  phase3/audit-gdpr  phase3/audit-immutability
phase3/jurisdiction-form  phase3/observability  phase3/p2-08-formatters
phase3/partner-admin  phase3/partner-api  phase3/per-market-jurisdiction
phase3/white-label  phase3/webhooks(current)  fix/p1-correctness-security
feat/antd-v5  chore/safe-brand-text-cleanup
```

Suggested (owner runs): `git branch -d <name>` for each (use `-d`, not `-D`, so git
refuses any that are NOT actually merged — a built-in safety check).

**⚠️ Two "merged" branches to KEEP despite the merged status:**
- **`phase3/tenancy-spike`** (`2d927739`) — tip is deployed (epic steps 1–2), but this is the **owner-paused P3-01 tenancy epic bookmark**; keep it as the resume pointer for steps 3–6.
- **`phase3/settlement-batching`** (`81a29ad4`) — tip is an ancestor of the deploy line, BUT the running memory log references P3-12-core work (commit ~`6f4f1a51`) that was **never pushed**; that work may be **dangling** (not on this branch tip). Verify `git log 6f4f1a51` exists / whether P3-12 core is still wanted **before** deleting. P3-12 core is unfinished.

## 3. Local `feat/binary-exchange-engine` is STALE

Local `feat/binary-exchange-engine` = `b748b440` (2026-06-07), **68 commits behind**
`origin/feat/binary-exchange-engine` = `0fccff51`. It is a clean ancestor (no
divergence), because the session pushed topic-branch→remote-feat directly rather than
through the local branch.
Suggested (owner): `git fetch origin && git branch -f feat/binary-exchange-engine origin/feat/binary-exchange-engine` (or just delete the local copy and track the remote).

## 4. Keep — snapshots / safety nets
- `archive/2026-06-pre-cleanup` (`851a75b6`) — explicit pre-cleanup snapshot.
- `backup/pre-deploy-1a6ef06f` (`1a6ef06f`) — pre-deploy backup.

## 5. Older Apr–May branches — NOT merged into the deploy line (owner to triage)

These predate the binary-exchange-engine trunk and are **not** ancestors of `0fccff51`.
Whether each is safe to delete depends on whether its work landed via another path or
was abandoned — **owner knowledge required**, so they are listed, not actioned:

```
feat/social-oauth  feat/social-oauth-deploy-wiring  feat/ai-market-drafting
feat/antd-v5(*see §2)  feat/risk-dashboard-v1  feat/ws-redis-pubsub
feat/gateway-rate-limiting  feat/office-prediction-tables-mono
feat/office-p8-foundation  feat/office-p8-app-router-sweep
feat/office-p8-pages-router-cleanup  chore/office-p8-final-stragglers
chore/office-cleanup-dormant-theme  chore/replace-skipped-marketcard-test
docs/archive-design-sportsbook  docs/design-md-office-p8-decision
fix/player-app-node-tests  fix/qa-cms-feature-flag
fix/qa-logs-remove-sportsbook-fields  deploy-chat-room  feat/hula-na-cashier
```
Note `feat/hula-na-cashier` corresponds to the separate `-cashier` worktree (has its own uncommitted frontend work per project memory) — do not prune without checking that worktree.

## 6. Recommended owner action sequence (none auto-executed)
1. **Decide §1 mainline strategy** (A/B/C) — everything else follows from this.
2. Prune the §2 merged session branches (`git branch -d`), keeping the two flagged exceptions.
3. Re-point/refresh the stale local `feat/binary-exchange-engine` (§3).
4. Verify the possibly-dangling P3-12-core commit before touching `phase3/settlement-batching`.
5. Triage §5 old branches with product/eng context; delete the confirmed-dead, keep the reference-worthy.

**Unblocks once §1 is decided:** P3-11 (E2E journey suite) and G-05 (CI-on-every-PR + clean-clone) both depend on a settled mainline + branch-protection target, so they remain dep-blocked on this decision.
