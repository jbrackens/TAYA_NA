# Target B Backend Execution Playbook

Date: 2026-03-19
Owner: Codex
Scope: Claude CLI execution playbook for finishing Phoenix Target B now that Target A is complete.

## Purpose

This file is not a replacement for
[`BACKEND_PARITY_EXECUTION_PLAN.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/BACKEND_PARITY_EXECUTION_PLAN.md).
It is the operating playbook Claude should follow while executing the remaining
Target B backend work.

Use this file to drive:

- planning discipline
- task decomposition
- subagent usage
- verification rigor
- mistake logging
- stop-and-replan behavior
- maintainable implementation choices

## Source Of Truth

Claude must review these before starting any non-trivial Target B slice:

1. [`BACKEND_PARITY_EXECUTION_PLAN.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/BACKEND_PARITY_EXECUTION_PLAN.md)
2. [`IMPLEMENTATION_STATUS.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/IMPLEMENTATION_STATUS.md)
3. [`SESSION_HANDOFF_2026-03-13.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SESSION_HANDOFF_2026-03-13.md)
4. [`SERVICE_CONTRACTS.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SERVICE_CONTRACTS.md)
5. [`gotchas.md`](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/gotchas.md)

If any of those files disagree, use this precedence:

1. service code + current tests
2. `SERVICE_CONTRACTS.md`
3. `IMPLEMENTATION_STATUS.md`
4. `BACKEND_PARITY_EXECUTION_PLAN.md`
5. session handoff notes

## Operating Rules

### 1. Always enter plan mode for non-trivial work

Use plan mode for any task with:

- 3 or more steps
- more than 1 service
- data model changes
- route contract changes
- frontend-visible behavior changes
- architecture or migration decisions

Every plan must define both:

- execution steps
- verification steps

### 2. Stop and re-plan when reality changes

If something breaks, stop and re-plan before continuing.

Hard stop triggers:

- a contract assumption is false
- a new service must be touched that was not in scope
- unrelated regressions appear in touched test suites
- a “small” slice becomes cross-cutting
- semantics are unclear and cannot be stated truthfully
- the cleanest fix is no longer the planned fix

When a hard stop happens:

1. record the mistake in `gotchas.md`
2. update the plan
3. redefine the slice more narrowly or explicitly widen it
4. resume only after the new plan is coherent

### 3. Write detailed specs before execution

Before implementing a slice, define:

- objective
- Target B classification
- exact services
- exact routes
- exact request/response shapes
- data model/migration impact
- audit/event impact
- tests to add or update
- smoke flow to prove it

Do not start coding with vague intent like “finish trading parity.”

### 4. Use subagents aggressively, but cleanly

For complex slices, use separate agents for:

- research
- execution
- verification

One task per agent. Do not give one agent a mixed research + implementation + QA brief.

Parallelize thinking, not just execution:

- one agent maps old/new contracts
- one agent locates current code paths and test gaps
- one agent proposes verification strategy
- execution workers each own a disjoint write scope

### 5. Convert mistakes into rules

After any mistake:

1. append it to `gotchas.md`
2. add a durable rule that prevents recurrence
3. review `gotchas.md` before the next slice

The goal is a falling error rate, not just local fixes.

### 6. Demand elegance

Ask before shipping:

- Is there a simpler way?
- Is the fix at the correct boundary?
- Are we preserving long-term maintainability?
- Are we adding one compatibility layer too many?

Prefer:

- service-boundary normalization over duplicated endpoint hacks
- truthful domain semantics over transport-only compatibility
- one clean compatibility adapter over multiple ad hoc transforms

Avoid:

- gateway monolith creep
- route aliases with divergent behavior
- fake parity
- temporary fixes that will need immediate rewrite

### 7. Stay flexible

Do not force a rigid checklist when the problem shape changes.
Provide context and structure, then adapt.

Flexibility is allowed.
Ambiguity is not.

## Target B Definition

Target B is complete only when:

- Milestones 1 through 4 in the backend parity plan are complete
- player sportsbook and prediction flows run fully on Go
- Talon talks only to Go APIs
- frontend migration can remove all old Phoenix backend dependencies

Current official milestone state from the parity plan:

- Milestone 1: complete
- Milestone 2: complete
- Milestone 3: incomplete
- Milestone 4: intentionally incomplete

## Target B Workstream Order

Target B should proceed in this order unless a concrete blocker forces reordering.

### Wave B0: Current-state reconciliation and backlog tagging

Goal:

- refresh the real post-Target-A, post-frontend-restoration Target B gap map before implementing new backend slices

Why this wave exists:

- some frontend and backend status docs are newer than others
- some surfaces were gated for Target A, then partially restored for Target B
- the backlog classification rule requires every remaining item to be tagged before work starts

Required outputs:

1. a current inventory of:
   - active Talon surfaces still gated, read-only, or partially supported
   - player flows still relying on compatibility seams or reduced semantics
   - backend routes that exist only as transport compatibility rather than truthful parity
2. a backlog table tagging each remaining item as:
   - `blocks Target B only`
   - `explicit non-goal for now`
3. a milestone mapping for each item:
   - Milestone 2
   - Milestone 3
   - Milestone 4
4. a recommended next slice with:
   - exact services
   - exact routes
   - exact verification plan

Mandatory sources for this wave:

- latest `IMPLEMENTATION_STATUS.md`
- latest `BACKEND_PARITY_EXECUTION_PLAN.md`
- current frontend state from:
  - Talon trading/admin surfaces
  - player prediction/sportsbook surfaces
- current service code and tests

Hard rule:

- do not start implementation directly from stale assumptions carried over from earlier passes

### Wave B1: Close Milestone 2

Goal:

- every currently active or intentionally restorable Talon surface is fully backed by Go

Primary backend focus:

1. trading/admin route parity
2. fixtures detail read depth
3. market detail write semantics
4. categories / visibility / fixed-exotics routes if they are meant to be restored
5. tournaments/leagues read surfaces if Talon still expects them

Likely touched services:

- `phoenix-gateway`
- `phoenix-events`
- `phoenix-market-engine`
- `phoenix-betting-engine`
- `phoenix-audit`

Exit condition:

- no active Talon screen remains gated only because Go lacks the backend path
- any still-gated surface is explicitly declared non-goal for Target B or moved to a later defined slice with reasons

### Wave B2: Close Milestone 3

Goal:

- exposed admin mutations have truthful semantics, not just transport compatibility

Primary backend focus:

1. bet settle/refund/resettle semantics
2. multi-leg/parlay admin mutation semantics
3. session-limit write semantics if the frontend path remains or is restored
4. market lifecycle actions with truthful accounting and audit
5. provider/payment mutation semantics that still rely on partial compatibility behavior

Likely touched services:

- `phoenix-betting-engine`
- `phoenix-wallet`
- `phoenix-market-engine`
- `phoenix-compliance`
- `phoenix-audit`

Exit condition:

- no exposed admin mutation remains “implemented” while still deliberately semantically unsupported

### Wave B3: Prediction + player-product depth

Goal:

- prediction and player product flows reach true dual-product parity on Go

Primary backend focus:

1. prediction reporting/admin depth
2. prediction public product depth
3. standings/leaderboard/history fidelity
4. player flow validation that no Scala dependency remains

Likely touched services:

- `phoenix-prediction`
- `phoenix-analytics`
- `phoenix-gateway`
- `phoenix-audit`

### Wave B4: Provider, jurisdiction, and realtime fidelity

Goal:

- replace compatibility seams with production-grade provider behavior where Target B requires it

Primary backend focus:

1. IdComply / KBA / IDPV depth
2. GeoComply / jurisdiction fidelity
3. websocket recovery/fanout fidelity
4. provider feed operational depth

Likely touched services:

- `phoenix-user`
- `phoenix-compliance`
- `phoenix-realtime`
- `phoenix-events`
- `phoenix-market-engine`
- `phoenix-gateway`

### Wave B5: Reporting, audit, and regulatory breadth

Goal:

- reporting/export/regulatory support is broad enough for full backend replacement

Primary backend focus:

1. report families still missing from analytics
2. richer audit retrieval/export depth
3. support/timeline/export completeness
4. regulatory export workflows

Likely touched services:

- `phoenix-analytics`
- `phoenix-audit`
- `phoenix-support-notes`
- `phoenix-gateway`

### Wave B6: Milestone 4 hardening

Goal:

- production hardening, observability, role-matrix coverage, failure-mode testing, runbook confidence

Primary backend focus:

1. role-matrix integration coverage
2. failure/recovery paths
3. replay/backfill confidence
4. operational dashboards and runbooks
5. provider/jurisdiction edge cases

Likely touched services:

- cross-service

Hard rule:

- hardening is primary only after Milestone 3 closure unless a bug makes it immediately necessary

## Slice Specification Template

Every Target B slice Claude executes must begin with a written spec in this format:

### Slice header

- Name
- Classification: `blocks Target B only` or `explicit non-goal`
- Milestone: `2`, `3`, or `4`
- Owner services
- User-visible surfaces affected

### Problem statement

- What is broken or incomplete now?
- Why does it matter for Target B?
- What truthfulness gap exists?

### Existing behavior

- current route(s)
- current payloads
- current persistence behavior
- current test coverage
- current frontend expectations

### Desired behavior

- exact routes
- exact request/response contracts
- exact mutation semantics
- exact audit/event side effects
- exact failure behavior

### Execution plan

List the code changes in order.

### Verification plan

List the tests and smoke flows in order.

### Re-plan triggers

List the facts that would invalidate the slice assumptions.

### Done definition

- what must be true before the slice is considered complete

### Backlog tagging

- exact Target B classification
- exact milestone
- why it is prioritized now instead of later

## Verification Contract

Every non-trivial slice must include all applicable layers below.

## Chunk Gate Rule

No new Target B chunk starts until the current chunk has:

1. completed its execution steps
2. completed its verification steps
3. recorded any mistake in `gotchas.md`
4. documented any residual risk explicitly
5. passed its required QA gate for the affected surfaces

Hard rule:

- do not stack multiple partially-validated slices just to keep momentum
- finish validation before opening the next chunk
- if validation is incomplete, the chunk is not complete

## QA Matrix

Target B work must be validated through these five categories:

1. Unit
2. Integration
3. End-to-end
4. Performance
5. Security

Not every slice needs the same depth in every category, but every slice must
explicitly state:

- which categories apply
- what exact commands/checks satisfy them
- what residual risk remains if a category is intentionally limited

### Unit test gate

Use for:

- service logic
- handlers
- repositories
- normalization/mapping logic
- policy decisions

Minimum expectation:

- touched service tests are green
- new logic has direct test coverage

### Integration test gate

Use for:

- gateway-to-service routing
- cross-service side effects
- DB migrations and persistence
- audit/outbox/wallet interactions

Minimum expectation:

- request/response contracts are verified
- cross-service behavior is proven for touched paths

### End-to-end gate

Use for:

- any user-visible or operator-visible behavior change
- any change that affects player or Talon flows

Minimum expectation:

- a focused smoke proves the real flow through the changed path
- if a real browser/admin flow is not available, that gap must be called out explicitly

### Performance gate

Use for:

- hot paths
- websocket/fanout changes
- query-heavy admin/reporting routes
- any slice that could materially change latency or throughput

Minimum expectation:

- light performance smoke for touched hot paths
- if skipped, the reason must be explicit and defensible

### Security gate

Use for:

- auth/session/verification changes
- payment/compliance/provider changes
- admin mutation routes
- any new external input or callback surface

Minimum expectation:

- permissions/role checks verified
- obvious trust-boundary regressions checked
- relevant service-level security smoke performed

### Service-level verification

- `go test ./...` or `go test -race ./...` in each touched service
- handler/service/repository tests for the changed behavior

### Contract verification

- prove gateway routes exist
- prove service route handlers match frontend/admin expectations
- prove request/response shapes are truthful

### Integration verification

- add or update compose/integration tests for cross-service behavior
- include wallet/audit/event side effects where relevant

### Smoke verification

- run a focused real flow that exercises the changed path
- include curl/browser/admin flows as appropriate

### Regression verification

- rerun the nearest existing Target A/Target B smoke if the slice could affect it

### Documentation verification

- update implementation status only when behavior truth materially changed
- do not overclaim completion

## Milestone Exit Gates

These gates must be satisfied before advancing to the next milestone.

### Milestone 2 exit gate

Before Milestone 2 can be called complete:

1. all active Talon surfaces affected by the milestone are backed by Go or intentionally gated
2. no mounted Talon control points at dead or semantically false backend behavior
3. unit and integration coverage for touched backend services are green
4. focused Talon/admin end-to-end smokes are green for the restored surfaces
5. performance smoke is run for any newly restored heavy admin routes
6. security smoke is run for any new admin mutation routes

### Milestone 3 exit gate

Before Milestone 3 can be called complete:

1. exposed admin mutations are semantically truthful, not just transport-compatible
2. accounting, audit, and compensation semantics are validated
3. unit and integration coverage prove mutation correctness
4. end-to-end smokes prove operator-visible mutation behavior
5. performance smoke is run for any mutation path that can create load or lock contention
6. security smoke verifies role enforcement and mutation safety

### Milestone 4 exit gate

Before Milestone 4 can be called complete:

1. role-matrix coverage is green
2. failure-mode and recovery coverage is green
3. reporting/export breadth is verified
4. provider and jurisdiction fidelity is verified to the required rollout depth
5. operational observability and runbook checks are green
6. the full QA matrix is complete at platform depth, not just slice depth

## Milestone Advancement Rule

Do not advance to the next milestone until the current milestone exit gate is met.

Allowed exception:

- urgent blocker work that is strictly required to make the current milestone verifiable

Not allowed:

- starting Milestone 3 implementation while Milestone 2 still has unvalidated active surfaces
- starting Milestone 4 hardening while Milestone 3 semantics are still transport-only

## Subagent Topology

Use this pattern for any complex slice.

### Research agent

Owns:

- old vs Go contract inventory
- route mapping
- missing semantics list

Output:

- concise diff
- exact route table
- ambiguity list

### Code-path agent

Owns:

- current implementation locations
- test locations
- write-scope proposal

Output:

- touched files list
- suggested write boundary

### Verification agent

Owns:

- exact tests to run/add
- smoke plan
- regression risks

Output:

- ordered verification checklist

### Execution worker(s)

Own:

- one service or one bounded write scope each

Rules:

- no overlapping write ownership
- no reverting other workers’ changes
- report exact files changed

## Re-Planning Protocol

When a slice breaks, do this immediately:

1. stop making new code changes
2. summarize the failed assumption
3. log it in `gotchas.md`
4. shrink or re-scope the slice
5. restate execution + verification before resuming

Never “push through” a broken assumption just to preserve momentum.

## Gotchas Protocol

`gotchas.md` is mandatory process memory for this Target B program.

After any mistake, add:

- date
- slice name
- what went wrong
- root cause
- rule added
- detection signal
- whether the rule was applied to the current re-plan

Before starting a new slice:

1. read `gotchas.md`
2. list the rules relevant to the slice
3. show how the plan avoids repeating them

## Elegance Rules

Before shipping any fix, answer:

1. Is the fix at the best boundary?
2. Can one compatibility adapter replace several scattered hacks?
3. Are we preserving service boundaries?
4. Are we adding truthful semantics or only transport?
5. Is there a smaller change that is still correct?

Preferred patterns:

- normalize once at the boundary
- keep domain semantics in the owning service
- keep gateway thin
- centralize legacy aliases where they reduce migration risk

Avoid:

- per-handler custom transforms for the same shape
- new dead-end compatibility routes
- duplicated audit logic
- transport shims that hide semantic gaps

## First Recommended Target B Slice

Start here unless Wave B0 proves a different blocker is more urgent.

### Slice 0: Target B reconciliation pass

Objective:

- produce the refreshed Target B backlog and identify the first implementation slice from current reality, not stale planning artifacts

Must answer:

1. which Talon surfaces are still gated, read-only, or semantically reduced?
2. which player flows still rely on compatibility seams rather than full parity?
3. which backend items are truly Milestone 2 vs 3 vs 4?
4. what is the cleanest next implementation slice?

Required outputs:

- backlog table
- service ownership table
- route inventory
- next slice recommendation with verification plan

### Slice: Trading admin parity closure

Objective:

- finish the backend required to restore the remaining Talon trading/admin surfaces truthfully

Likely scope:

1. fixture detail read model depth
2. market detail lifecycle/write semantics
3. categories / visibility routes if the frontend still intends to expose them
4. fixed-exotics admin routes only if they are real Target B scope

Why first:

- this is the cleanest bridge from Target A gating to Target B full parity
- the frontend has already identified the exact gated/read-only surfaces
- it closes Milestone 2 before deeper Milestone 3/4 hardening

Required outputs:

- route inventory
- exact service ownership per route
- missing semantic list
- implementation plan
- verification plan

## Completion Standard For Claude

Claude should not declare a Target B slice done unless:

- execution steps were completed
- verification steps were completed
- any mistake was logged in `gotchas.md`
- the implementation is cleaner than the obvious hack
- the docs are updated if truth changed
- the final report states what remains

If a slice is only partially closed, say so explicitly and carry the exact residual blockers forward.
