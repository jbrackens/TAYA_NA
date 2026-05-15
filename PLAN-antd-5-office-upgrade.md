# PLAN: Office antd 4 → antd 5 upgrade

**Status:** ready to execute (engineering side scoped; product approval still needed before merge)
**Branch:** new `feat/office-antd-5` recommended
**Author:** /continue-with-TODOs session 2026-05-15
**Goal:** retire the "render is not exported from react-dom" + "unmountComponentAtNode" compile warnings on `packages/office` by upgrading antd 4.16.12 → antd 5 (latest 5.x supports React 16-19 natively).

## Why now

- ISSUE-007 (this work) is the last remaining engineering Open item on TODOS.md.
- The office app is the prediction-admin surface — growing, not shrinking. Locking in antd 4 compounds risk every time React 19.x tightens.
- Antd 4 lifecycle: 4.x is in "stale" maintenance; security fixes only. Antd 5.x is the active line.

## Scope summary (from automated grep audit)

| Surface | Count | antd-5 impact |
|---|---:|---|
| antd named imports (root) | 103 | most stay; 2 removed components |
| antd subpath imports (`antd/lib/*`) | 12 | flip to root imports |
| DatePicker / TimePicker | 6 | moment → dayjs |
| PageHeader | 3 (1 component) | **REMOVED** — replace with a thin custom header |
| Comment component | 0 | n/a |
| `dropdownClassName` prop | 0 | n/a (popular rename, not present here) |
| `Form.Item noStyle` | 0 | n/a |
| LESS antd overrides (`@import "antd/dist/..."`) | 0 | n/a — no theme migration needed |
| `moment` direct imports | 2 | switch to dayjs |
| `ConfigProvider` / theme tokens | not used today | optional CSS-in-JS theming win |

**Verdict:** much smaller than the dependency count suggests. ~5 components need code changes; the rest is bump-the-version + run-tests.

## Phased plan

### Phase 1 — Dependency bump + lockfile (30 min)

```bash
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/office
yarn add antd@^5
yarn add @ant-design/icons@^5
yarn remove @ant-design/icons-svg   # antd 5 bundles icons differently
```

After install:
```bash
yarn install --frozen-lockfile  # validate lockfile resolves
```

### Phase 2 — Mechanical rewrites (1-2 h, scriptable)

**2a. Replace `antd/lib/*` subpath imports with root imports.** 12 sites. Script:

```bash
find . -type f \( -name '*.tsx' -o -name '*.ts' \) \
  ! -path '*/node_modules/*' \
  -exec sed -i.bak -E '
    s|from "antd/lib/space"|from "antd"|;
    s|from "antd/lib/input-number"|from "antd"|;
    s|from "antd/lib/form/FormItem"|from "antd"|;
    s|from "antd/lib/table"|from "antd"|;
    s|from "antd/lib/spin"|from "antd"|;
    s|from "antd/lib/page-header"|from "antd"|;
    s|from "antd/lib/layout"|from "antd"|;
    s|from "antd/lib/form"|from "antd"|;
    s|from "antd/lib/divider"|from "antd"|;
  ' {} +
find . -name '*.bak' -delete
```

The named imports change (e.g. `FormItem` becomes `Form.Item`); audit by hand after the sed pass — there are only ~10 sites so this is fast.

**2b. PageHeader replacement.** Antd 5 removed PageHeader. The office wraps it in `components/layout/page-header/index.tsx` / `index.styled.ts`. Replace the styled wrapper with a flat custom component that takes `title` + `subTitle` + `extra` and renders the same DOM the existing styled wrapper produced. Single-file change; all 100+ callsites of the wrapper component keep working.

**2c. moment → dayjs.** 2 direct moment imports + 6 DatePicker/TimePicker call sites. Antd 5 ships with dayjs by default. Run:

```bash
yarn remove moment
yarn add dayjs
```

Replace `import moment from 'moment'` with `import dayjs from 'dayjs'`. The DatePicker call sites just need their value props to be dayjs objects instead of moment objects — `dayjs(value)` for the conversion. Both libraries have nearly identical APIs for the formatting and arithmetic the office uses.

**2d. Drop the `@ts-ignore` shims** the office sprinkled to suppress the antd-4 type errors. Search and remove:

```bash
grep -rn "@ts-ignore.*antd\|@ts-expect-error.*antd" --include='*.tsx' --include='*.ts' .
```

### Phase 3 — Manual test pass (1 h)

Boot the office on `:3001` and click every prediction-admin page:

- `/dashboard` — drift badges, volume panel, top movers
- `/prediction-admin/markets` — list, Create Market modal, lifecycle actions
- `/prediction-admin/settlements` — settlement queue, Resolve modal with attestation source

For each page:
1. Browser console should be empty of antd-related warnings.
2. Every modal opens, accepts input, submits successfully.
3. DatePickers display in the cream theme correctly.

### Phase 4 — Optional polish (0.5-1 h)

Antd 5's `ConfigProvider` + `theme.useToken()` lets the office's antd components inherit the P8 design tokens (mint emerald accent, AA-contrast text, cream backdrop) without the current `styles/p8-antd.css` overrides. Wire `<ConfigProvider theme={{ token: { colorPrimary: 'var(--accent)' } }}>` at the app root and delete the overrides incrementally as the antd components start using the tokens directly.

This is a nice-to-have, not a blocker. Skip for the first PR; do it as a follow-up.

## Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Custom PageHeader replacement renders differently from antd 4's PageHeader. | Component-level visual diff before/after on the affected pages. The custom version is straightforward (~30 lines of JSX); harder to get wrong than easier. |
| 2 | DatePicker value-shape mismatch breaks form submission (moment object passed where dayjs is expected, or vice versa). | TypeScript catches most cases. Visual + functional test on every page that uses date inputs (Phase 3). |
| 3 | Some antd-4 components we use have semantic API changes I didn't catch in the grep audit. | Phase 3 manual test pass on every prediction-admin page is the safety net. Easier than promising "exhaustive automated tests" because the office's existing test coverage is thin. |

## NOT in scope

- Backfill the existing `prediction_markets.fee_rate_bps = 0` rows with the new 100 bps default. Captured separately if it becomes needed.
- Migrating the player app to antd 5. Player app has zero antd usage post the dead-dep cleanup; nothing to migrate.
- Theme work (Phase 4 above) — optional.

## Verification gate

Before merge:
- `yarn workspace @phoenix-ui/office build` succeeds with zero antd-related warnings.
- All four prediction-admin pages render + accept input + submit successfully in a manual click-through.
- TypeScript build clean (`yarn tsc --noEmit -p packages/office`).
- `git grep "from \"antd/lib"` returns nothing.

## Effort

- Phase 1: 30 min
- Phase 2: 1-2 h (mostly mechanical, some PageHeader judgment work)
- Phase 3: 1 h manual click-through
- Phase 4 (optional): 0.5-1 h

**Total: 3-5 h of focused work**, single PR.

## What unblocks this

User approval to start. The migration itself is engineering-side scoped end-to-end. The risk surface is bounded and the test plan is concrete.
