> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# GAP-32 slice 2 — Unified case SHARED MODEL — DESIGN NOTE / BLOCKED

**Spec:** PAM §19 Case Management; §9 Workflows; §32 Scenario 19.
**Status:** BLOCKED — needs a product/compliance approach decision (see Decision). Slice 1 (the read-only cross-domain case CENTER, `GET /api/v1/admin/cases`) is DONE (`15bb000d`, hardened `826a40ff`). This note covers slice 2: the shared, writable case model with assignee / SLA / notes / approval across all six §19 types.

## Requirement (§19)
"Structured cases by type (**KYC, AML, fraud, integrity, dispute, withdrawal**) with status, **assignee**, priority, **SLA**, linked entities, **notes**, and **approval steps (maker-checker where required)**." Built on the notes/event timeline + Dual-Approval workflow.

## Gap re-verification (2026-07-04, VERIFIED)
Two case stores exist, each owning its own table, and they DIVERGE:
- `aml_cases` (`internal/aml/aml.go:111`): `id, title, status(open|investigating|closed_sar_filed|closed_no_action), priority(low|medium|high), subject_id, opened_by, resolution, sar_reference, created_at, updated_at`.
- `surveillance_cases` (`internal/surveillance/surveillance.go:67`): `id, title, status(open|investigating|closed_action|closed_no_action), priority, opened_by, resolution, created_at, updated_at`.

Findings that make this a design decision, not a mechanical slice:
1. **No home for 4 of the 6 types.** KYC, fraud, dispute, and withdrawal (and general support) cases have NO table today — only AML and (market-)integrity do.
2. **Neither table has `assignee` or an SLA field.** §19 mandates both.
3. **The status enums differ** (`closed_sar_filed` vs `closed_action`) and reflect domain-specific terminal workflows (SAR filing vs action taken) that should NOT be flattened away.
4. **`surveillance_cases` has no `subject_id`** (market-scoped, not player-scoped) — a single "subject" column doesn't fit all types uniformly.
5. Approval steps: the maker-checker engine already exists (`internal/makerchecker/makerchecker.go`, P0-6) and can back "approval steps where required" — but wiring it per case-type is a policy decision.

## The core question
**How do we get one shared, writable case model with assignee/SLA/notes/approval across all six types WITHOUT either (a) a risky migration of the live compliance case stores, or (b) a third divergent schema?**

## Options
- **A — One unified `cases` table; migrate `aml_cases` + `surveillance_cases` into it.** Purest end-state (one schema, one workflow). Cost: a data migration of LIVE compliance case stores (AML SAR references, surveillance actions), rewriting the aml/surveillance stores to read/write the unified table, preserving their distinct terminal statuses as a `type`+`status` combination, and re-pointing their audited endpoints. High blast radius on compliance-critical data; the AML store is a fail-closed, hash-audited surface. Risky to do autonomously.
- **B (RECOMMENDED) — New unified `cases` table for the un-homed types + keep AML/surveillance as-is + the read-only center aggregates all three.** Add a `cases` table with the FULL §19 field set (`type` ∈ the six, `assignee`, `priority`, `status`, `subject_id NULLable`, `sla_due_at`, `opened_by`, timestamps) plus a `case_notes` child table (author, body, created_at — the §19 notes/timeline) and approval routed through the existing maker-checker for the types that require it. KYC/fraud/dispute/withdrawal/general cases live here with assignee+SLA. AML and surveillance keep their own audited stores and terminal workflows; the slice-1 center already aggregates all three read-only. Additive, non-invasive, no compliance-store migration. Later, `aml_cases`/`surveillance_cases` can adopt the shared `assignee`/`sla_due_at` columns incrementally (idempotent ALTERs) so assignment/SLA become uniform without a big-bang migration.
- **C — Add `assignee` + `sla_due_at` columns to EACH existing table + build the new-types table too.** Gets assignee/SLA everywhere fastest, but leaves three tables (the "third divergent schema" GAP-32 explicitly warns against) and duplicated case CRUD.

## Recommendation
**B.** It satisfies §19 (a writable case surface for the un-homed types with assignee/SLA/notes/maker-checker approval, plus the unified read center already shipped) while leaving the live, audited AML/surveillance compliance workflows untouched — the fail-closed-first choice. The end-state convergence (AML/surveillance adopting the shared assignee/SLA columns) is an incremental follow-on, not a prerequisite.

## If approved — implementation sketch (slice 2a/2b)
- **2a (backend):** goose migration for `cases` (type/assignee/priority/status/subject_id?/sla_due_at/opened_by/timestamps, CHECK on type ∈ six) + `case_notes` (case_id FK, author, body, created_at). New `internal/cases` store (Create/List/Get/Assign/SetStatus/AddNote) + `POST/PUT /api/v1/admin/cases…` handlers, RBAC `cases:read`/`cases:write` (new permission via migration) or reuse `compliance:*`; every mutation audited; status transitions guarded; approval-required transitions (e.g. closing a withdrawal/fraud case above a threshold) routed through `makerchecker`. Slice-1 center query gains the new table as a third UNION branch.
- **2b (office):** a Case Center page (list/filter/assign/note/close) + link the Profile-360 Cases tab (GAP-35) rows through to it.

## Unblock criteria
A human/compliance owner:
1. Approves approach **B** (vs A's migration / C's per-table columns).
2. Provides the **SLA matrix** (target resolution time per type × priority) — a compliance-regime input, same class as the P0-5 AML rule set.
3. Confirms the **case-type → permission** mapping (one `cases:write`, or per-domain permissions) and which type/threshold transitions require maker-checker approval.

Until those land, a fabricated SLA policy / type taxonomy would be a compliance guess, not a control — so slice 2 stays BLOCKED. Slice 1 (read center) already delivers cross-domain case visibility, and GAP-35's Cases tab consumes it.
