# Backend Terminology Cleanup Artifact

Generated: 2026-06-28 22:13:35 Europe/Malta

## Scope

This artifact covers a narrow terminology cleanup in active wallet, settlement,
player CSS, and office shell source files. It intentionally does not rename
inherited storage columns, Go type names, or compatibility fields.

## Verification Results

- `git diff --check` over touched files: passed.
- Targeted unsafe-phrase scan over touched active areas: no matches for
  `returning stake`, `real money`, `dollar amounts`, `financials (wallet balance`,
  `portfolio P&L`, or `refund stakes`.
- Focused Go tests:

```txt
ok  	phoenix-revival/gateway/internal/wallet	0.367s
ok  	phoenix-revival/gateway/internal/prediction	0.662s
```
- Preservation modification gate: passed after adding `globals.css` to the
  player launch surface classification. The regenerated map classified 392
  modified artifacts, including 89 high-risk contract files and 35 large-change
  files.

## Important Behavior Change

Void-refund ledger credits now use:

```txt
prediction refund: market <ticker> voided, returning locked points
```

instead of:

```txt
prediction refund: market <ticker> voided, returning stake
```
