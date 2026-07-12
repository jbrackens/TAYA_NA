# 99RTP Predict — P10 "Signal Ink" Redesign · Handoff

**Date:** 2026-07-12 · **Branch:** `feat/predict-redesign-p10` (not merged; `main` push = production deploy per repo policy — owner merges) · **Author:** Claude (research → strategy → design → implementation → QA, one pass)

## Deliverables index

1. [01-research-report.md](01-research-report.md) — current-product UX audit (10 honesty findings, IA/flows, a11y/perf), 5-competitor scorecard, trends/audience/regulatory research, insight-to-decision table. Full per-source data in [research-data/](research-data/) (11 JSON artifacts incl. the judge panel).
2. [02-brand-strategy.md](02-brand-strategy.md) — positioning, three original directions, independent 3-judge scorecard, recommendation (B · "Signal Ink") + adopted conditions.
3. [03-redesign-spec.md](03-redesign-spec.md) — IA, segment mapping, honesty layer, per-surface states, tokens, logo/wordmark system, a11y+perf work lists.
4. [04-change-log.md](04-change-log.md) — every implemented change with files.
5. [05-qa-report.md](05-qa-report.md) — gates, functional/visual/a11y/perf results, re-encoded locks, open items.
6. Brand assets — `app/components/BrandWordmark.tsx` (drawn vector logotype), `BrandMark.tsx` (kept), `public/brand/wordmark.svg` / `wordmark-dark.svg` / `mark.svg`, regeneration script `scripts/redesign/wordmark.py` (name-portable rule for P3-04).

## Readiness statement (direct, per sign-off area)

- **Design: READY for owner review.** The P10 system is implemented and consistent across shell, discovery, market, ticket, portfolio, auth, landing, and footer. The three brand signatures (split-crossbar wordmark, ink actions, tap-dot motion) are live; the judge panel's crop-test criterion should be applied by the owner on the rendered build.
- **Engineering: READY for review, NOT yet merged.** All gates green locally (tsc, 23/23 unit files, gate.sh 8/8 incl. production build, 25/25 smokes modulo self-inflicted rate-limit reruns). Two commits on the branch; API contracts untouched; two backend follow-ups filed (public comment reads, windowed volume).
- **Legal/compliance: NOT ready — requires owner/counsel review.** All risk/points/disclosure copy was rewritten to the evidence-based perimeter (non-redeemable points, affirmative non-registration statement, no protection implications), but none of it is counsel-approved, and the RG/KYC/limits flag posture per jurisdiction remains an owner decision (ADR-0003/0004 still owner-gated).
- **Release: NOT ready to deploy today.** Blockers before merging to `main`: (1) owner design sign-off incl. wordmark, (2) counsel pass on copy, (3) a real-device scroll-through + screen-reader/axe sweep (§6 of the QA report), (4) decision on dropping `NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS` from the demo deploy now that real seeded history renders, (5) Core Web Vitals measurement on the deployed build.

No material redesign, implementation, or QA work from the brief remains unattempted; what remains is enumerated above and in QA §8 (deferred items are listed there explicitly, none load-bearing for the demo).
