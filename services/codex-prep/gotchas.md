# Target B Gotchas

Use this file as mandatory process memory during Target B backend execution.

## Rules

- Read this file before starting any non-trivial slice.
- After any mistake, add a new entry immediately.
- Convert each mistake into a durable rule.
- Apply the relevant rules in the next re-plan.

## Entry Template

```md
## 2026-03-19 - Slice name

- Mistake:
- Root cause:
- Detection signal:
- New rule:
- Applied in re-plan:
```

## Entries

## 2026-03-19 - Wave B0 users-list reconciliation

- Mistake: Prior reconciliation treated the mounted users-list gap as response-shape-only (missing firstName/lastName/dateOfBirth fields). Did not verify the request contract: the mounted Talon page sends legacy nested query params (`query.filter.*`, `query.pagination.*`) which `phoenix-user` does not parse.
- Root cause: Reconciliation checked response shape against the Go struct but did not read the Talon container code to verify the request contract the mounted page actually sends.
- Detection signal: Reading the Talon `containers/users/index.tsx` and `api-service.ts` reveals `qs.stringify` nested params that the Go handler ignores.
- New rule: Never call a mounted surface "one-field away" without verifying BOTH request contract AND response consumption shape against the live frontend code.
- Applied in re-plan: Yes — this slice now covers both response enrichment and request-contract compatibility.

## 2026-03-19 - M37 users-list request contract

- Mistake: Handler parsed `query.filter.*` and `query.pagination.*` params, but the actual Talon `useApi` sends `filter.*` and `pagination.*` (no `query.` prefix). The `query` key in `useApi` params tells the hook to qs.stringify its value — it is not itself serialized as a prefix.
- Root cause: Read the Talon container code but misinterpreted how `qs.stringify(params.query, {allowDots: true})` serializes the nested object. The `query` key is consumed by useApi as a directive, not emitted as a URL param prefix.
- Detection signal: Live Playwright network trace showed `filter.username=demoadmin` in the actual request, not `query.filter.username=demoadmin`. Filter returned all users instead of 1.
- New rule: Always verify actual network request shapes via browser trace, not by reading code and guessing serialization output.
- Applied in re-plan: Yes — fixing handler param names now.

## 2026-03-20 - M3-S3 fixture lifecycle assessment

- Mistake: Assumed fixture detail page was "mounted with dead freeze/unfreeze controls" based on the page file existing at `/risk-management/fixtures/[id]`. Did not verify the data-fetch route.
- Root cause: The page exists as a Next.js route but its GET call uses `admin/trading/fixtures/:id` which has no Go gateway route. The page shows a perpetual loading skeleton. The freeze/unfreeze buttons never render because `basicData` is always empty.
- Detection signal: Reading the detail container revealed `useApi("admin/trading/fixtures/:id")` at line 58. Grepping the gateway route repository confirmed no `admin/trading` routes exist.
- New rule: Before classifying a page as "mounted with dead controls," verify the page's data-fetch route actually works. A page that can't load data is not effectively mounted.
- Applied in re-plan: Yes — reclassified fixture detail as non-functional (not M3-blocking).
