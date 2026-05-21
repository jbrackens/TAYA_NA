# PLAN: Office antd 4 → antd 5 upgrade

**Status:** **EXECUTED end-to-end on `feat/antd-v5` (NOT pushed).** 4 commits + Phase 3 verification proof. Deploy gated per primer §8.
**Branch:** `feat/antd-v5` (not `feat/office-antd-5` as originally proposed)
**Author:** /continue-with-TODOs session 2026-05-15; executed 2026-05-19 → 2026-05-20
**Original goal (2026-05-15):** retire React-19 compile warnings by upgrading antd 4.16.12 → 5.
**Actual trigger (2026-05-18):** F3/F4 hard blockers — AntD 4.16 modals don't close and toasts don't render under React 19 (`findDOMNode` + `element.ref` removed). Settlement queue rendered but Settle Modal was unusable. The "nice cleanup" became "must ship now."

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

---

## EXECUTION OUTCOME (2026-05-19 → 2026-05-20)

The plan above is the **original 2026-05-15 scoping**, kept as historical record. The actual execution diverged: the trigger escalated from "warnings cleanup" to "hard blocker" on 2026-05-18, scope grew, phase numbering shifted, and Codex adversarial review caught several holes the plan missed.

### Plan-vs-reality map

| Original plan phase | What actually shipped |
|---|---|
| Phase 1 (deps bump, 30 min) | Folded into **execution Phase 0** (commit `dda682d7`) — also added `@ant-design/v5-patch-for-react-19`, `@ant-design/nextjs-registry` (AntdRegistry for cssinjs SSR), and React-19 hoist verification. GO/NO-GO smoke test gated the rest. |
| Phase 2 (mechanical rewrites, 1-2 h) | Became **execution Phase 1** (commit `fa1677f6`). Codemod tool refused to work + reformatted parseable files for 4 real renames; reverted, did it manually. Scope grew: **Tabs.TabPane removed** (not in original audit — required two children→items bridge wrappers), Menu items API rewrite, Modal `visible`→`open` TS surface, PageHeader replaced with v5-primitives component. |
| Phase 3 (manual test, 1 h) | Became **execution Phase 3** (no commit — verification only). Drove throwaway market `QA-V5-1779277648440` end-to-end through the office UI; verified settle round-trip + visible success toast + gateway-side `status: settled` |
| Phase 4 (optional ConfigProvider polish) | **Promoted to required** — became **execution Phase 2** (commit `0bcdea38`). Without theme tokens wired up, AntD's internal-class permutations bypass `styles/p8-antd.css` overrides, so v5 components paint default-blue instead of P8 mint. Not optional. |
| Codemod-driven flow | **Falsified.** `@ant-design/codemod-v5` refused dirty trees, then skipped all 53 modern TSX files, then reformatted parseable files with 1568 lines of recast whitespace churn for 4 real renames. Reverted. Manual `xargs sed` + targeted `Edit` calls worked. |
| 3-5 h total | Actual: ~2 days of focused work (incl. Codex review iteration + verification). |

### Scope additions not in original plan (must-have, all done)

1. **`@ant-design/v5-patch-for-react-19`** centralized in [`app/lib/antd-patch.tsx`](apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/lib/antd-patch.tsx). Patches static `Modal.confirm` / `message.*` / `notification.*` (rc-util render path React 19 removed). Loaded in both App Router (`app/layout.tsx`) and Pages Router (`pages/_app.js`) top-of-file.
2. **`AntdRegistry`** from `@ant-design/nextjs-registry` wraps the App Router tree. Without it, v5 cssinjs motion styles don't apply and Modal/Drawer enter-leave animations freeze mid-transition (rc-motion never sees `transitionend`).
3. **Tabs children→items bridge** ([`components/layout/tabs/build-items.ts`](apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/components/layout/tabs/build-items.ts)) — shared hardened helper used by `TabsSection` and `TabsUserDetails`. Marker-type guard, Fragment flattening, missing-key dev warning, full prop forward, `destroyInactiveTabPane`→`destroyOnHidden` rename, memoized item identity. Preserves consumer JSX (`<TabPane key tab>...</TabPane>`).
4. **Reduced-motion mitigation** in [`app/lib/antd-config-provider.tsx`](apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/lib/antd-config-provider.tsx) — when `prefers-reduced-motion: reduce`, disable AntD's motion tokens. rc-motion's `transitionend` dependency gets throttled in backgrounded tabs and low-power modes; Modal/Drawer/Tooltip then close instantly.
5. **NO `hashPriority="high"`** — deliberate. v5's `:where()` zero-specificity wrap means existing `.ant-*` class overrides in `styles/p8-antd.css` keep winning. Setting `hashPriority="high"` would flip the cascade and require rewriting every override.
6. **Hoist single React** — react/react-dom moved to workspace root `package.json` to guarantee a single React copy across packages; verified via `find node_modules -name react -type d`.
7. **F2 CSRF fix carried forward** (commit `d0937941`) — login route mints `csrf_token` cookie; preserved through the v5 migration. Verified: throwaway market admin writes still return 200 under v5.

### Codex adversarial review of plan (2026-05-19)

Codex flagged 13 holes. 4 blockers fixed inline:

- **#3 Patch import scattered** → centralized in `antd-patch.tsx`, single source of truth.
- **#5/#7 Tabs bridge fragility** → hardened with marker-type guard + Fragment flattening + missing-key warning + memoized identity.
- **#8 React copies unverified** → ran the hoist check and confirmed single copy.
- **#11 Animation freeze in headless/throttled tabs** → reduced-motion ConfigProvider toggle.

Codex follow-ups remaining (see Debt below): #4, #6, #9, #10, #12.

### Phase 3 end-to-end proof (2026-05-20)

Throwaway market `QA-V5-1779277648440` (id `4a6e6699-962b-405c-af58-488d2a74eb2b`) driven through the full stack via the office UI:

- create 201 → open 200 → close 200 → settle 200 (CSRF still works under v5)
- Settle modal opens, outcome select renders, attestation form validates, type-the-ticker guard fires
- **Toast visible in DOM:** "Market settled: QA-V5-1779277648440 → yes (0 payouts)" with green-check icon (F3 PROVEN — v5 `message.success` renders under React 19)
- Gateway authoritative state: `GET /api/v1/markets/{id}` → `{ status: "settled", result: "yes", updatedAt: 2026-05-20T11:48:33Z }` (F4 PROVEN — modal handler completed, no React 19 reconciler freeze)
- Full verification log appended to [.gstack/qa-reports/qa-report-office-settlements-2026-05-18.md](.gstack/qa-reports/qa-report-office-settlements-2026-05-18.md) (local artifact, gitignored).

### Commits on `feat/antd-v5` (NOT pushed — deploy gated per primer §8)

| Commit | What |
|---|---|
| `d0937941` | F2 fix — mint `csrf_token` cookie on login (carried into the v5 branch) |
| `dda682d7` | Phase 0 — foundation + GO/NO-GO validated |
| `fa1677f6` | Phase 1 — v5 API sweep + 4 Codex blockers |
| `0bcdea38` | Phase 2 — P8 design tokens via ConfigProvider |

---

## CLEANUP UPDATE (2026-05-20 post-deploy)

After the v5 work was deployed and stable on `feat/binary-exchange-engine`, three follow-up cleanup commits landed:

| Commit | What |
|---|---|
| `8bf3b0b2` | `chore(office): migrate static AntD APIs to App.useApp() hook` — wraps `AntdConfigProvider` children with `<App>`; migrates 29 `message.*` callsites across 12 components, plus the lone `Modal.confirm` in `containers/prediction-markets/index.tsx:175` and the `notification.error` in `components/layout/index.tsx`. Verified live: confirm-dialog opens cleanly + zero AntD context warnings across the App-Router sweep (dashboard, users, audit-logs, campaigns, content, reports, leaderboards, loyalty, loyalty/settings). **Closes debt #1.** |
| `4ca9ca9b` | `chore(office): centralize App-Router admin fetches via adminFetch helper` — new `app/lib/admin-fetch.ts` consolidates `credentials: "include"`, `X-Admin-Role: admin`, and `X-CSRF-Token` (read from the `csrf_token` cookie) on every state-changing request. 12 App-Router pages migrated. Also adds `skipTrailingSlashRedirect: true` to `next.config.js` so `/api/v1/admin/foo` doesn't 308 to `/api/v1/admin/foo/` ahead of the rewrite. |
| `d99f5076` | `chore(office): scaffold Vitest test suite` — replaces the broken Jest 25 + babel-jest + TS 5 setup with Vitest + happy-dom. 7 passing tests for the new `adminFetch` helper, ~400ms total runtime. **Partial close of debt #11** — harness exists, future tests just need a file under `tests/`. |

### Live Halt+Resume smoke (modal.confirm round-trip, 2026-05-20)

Throwaway market `IMP-931C4BD8` (id `18bd42da-c296-4bca-8bf2-0d4cc65b5d2f`, $0 volume) driven through the full v5 `modal.confirm()` happy path:

- Click Halt on /prediction-admin/markets → `modal.confirm()` dialog opens with "Halt IMP-931C4BD8?" title, reason textarea, "Halt market" danger button
- Fill reason → click "Halt market" → React handler completes → gateway `GET /api/v1/markets?status=halted` confirms `status: "halted"`
- Resume button (single-click, no confirm) → state restored to `status: "open"`
- Sentinel watching `Static function` / `App.useApp` / `consume context` across the full flow: **0 matches**

**Closes debt #9.**

### Findings worth recording

- **Gateway scope gap (new debt — out of scope for v5 cleanup):** `internal/http/admin_handlers.go:148` defines `registerAdminRoutes()` (wires `/api/v1/admin/punters`, `/api/v1/admin/punters/{id}/{status,limits,notes,reset-password,risk-segment}`, plus admin trading/utility/wallet routes) but `internal/http/handlers.go:25-295` (`RegisterRoutes`) never calls it. Every App-Router page that loads from those endpoints (`/users`, `/users/[id]`, `/audit-logs`) returns "Failed to load …" because the gateway responds 404. The `adminFetch` refactor is correct preparatory work; wiring the registrations is a Go-side change + rebuild + Docker compose redeploy. Filed as a follow-up gateway PR, not blocking the office cleanup.
- **Docker single-file bind-mount audit:** the only single-file bind mount in `apps/Phoenix-Predict-Combined/docker-compose*.yml` is `./Caddyfile:/etc/caddy/Caddyfile:ro` — the known footgun, already patched via deploy-time `--force-recreate`. `services/codex-prep/docker-compose.demo.yml` uses a directory bind mount which is inode-safe. **Closes debt-table item #6 (single-file bind-mount footgun) — no new bind-mount risks.**

---

## DEBT / FIX OPPORTUNITIES (post-merge follow-ups)

Tracked here so they don't fall on the floor. None block merge or deploy of `feat/antd-v5`.

### Known dev warnings (cosmetic, dev-only — production strips them)

1. ~~**`[antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.`** — fires twice per session.~~ ✅ **DONE in commit `8bf3b0b2` (2026-05-20).** Migrated 29 `message.*` callsites + 1 `Modal.confirm` + 1 `notification.*` to `App.useApp()`. Verified zero warnings across 9 swept admin pages.

### Codex follow-ups not addressed in Phase 1

2. ~~**#4 Pages-Router cssinjs strategy**~~ ✅ **DONE 2026-05-21 (commit `835f211e`).** Added the official AntD Pages-Router recipe to `pages/_document.tsx`: per-request cssinjs cache fed by `StyleProvider` during the server render, `extractStyle()` inlined as `<style id="antd-cssinjs">`, composed with the existing styled-components `ServerStyleSheet`. Verified in dev SSR — `/logs`, `/terms-and-conditions`, `/account/settings` now emit 286–403 KB of extracted AntD CSS in `<head>` (the tag didn't exist before). No `_app.js` change needed.
3. **#6 Hydration suppression (`pages/_app.js`)** — 🟡 root cause nailed + partly mitigated 2026-05-21 (commit `e24c2f34`); full fix still deferred. The DEV-ONLY suppression (no-op in prod) blames "menus, profile, tokens" but those are already safe (SidebarMenu uses a `mounted` gate; Header is `dynamic({ssr:false})`). The **real** dominant source is timezone date formatting: `useTimezone` (`packages/utils/src/hooks/timezone`) reads the saved TZ from localStorage at render and falls back to `dayjs.tz.guess()` on the server, so EVERY admin-table date cell mismatches. That pervasiveness is why it's a blanket suppression. The `_app.js` comment now documents this accurately, and the one non-date source (`/account/settings` timezone label) is migrated to per-element `suppressHydrationWarning`. **Proper fix (deferred, app-wide, dev-only payoff):** make `useTimezone` mounted-aware (render UTC/undefined until mount, then switch) OR pin a single SSR timezone and let the client reconcile, then drop the `_app.js` block. Removing the `MutationObserver` before that lands just brings the dev overlay back on every dated table.
4. **#9 / #10 Phase-2 corrections (already absorbed)** — keep structural CSS in `styles/p8-antd.css` (e.g. PageHeader layout, table cell padding) even though tokens cover colors; do NOT set `hashPriority="high"`. **Status:** done — documented inline in `app/lib/antd-config-provider.tsx`. No further action.
5. **#12 Warning-debt cleanup in app/** — `console.error` suppression block in `pages/_app.js:25-40` is a sledgehammer. Replace with targeted hydration-warning ignore at the React level once #6 is resolved. Estimated 30 min after #6 ships.

### Migration residue (low priority)

6. **Untracked PRIMER files** at the repo root (5 PRIMER-2026-05-*.md files). Primer §4 says these are local-only working notes; they're correctly untracked. **Fix:** confirm with user whether to delete or move to `.gstack/primers/`. Estimated 5 min.
7. **`.codex-reviews/getfix-review-raw.txt`** also untracked. Same status as primers; ephemeral review artifact. **Fix:** delete or archive. Estimated 1 min.

### Verification gaps that the original plan asked for but Phase 3 only partially covered

8. ~~**DatePicker form submission**~~ ✅ **MOOT (resolved 2026-05-20).** Inspected the Create Market modal: it uses native `<input type="datetime-local">` for the closeAt field, NOT AntD DatePicker. No moment/dayjs surface to test. Other DatePicker imports in the v5 audit were either removed or never reached on hot paths.
9. ~~**`Modal.confirm` Halt/Close paths** — `containers/prediction-markets/index.tsx:175` uses `Modal.confirm` for Halt/Close lifecycle confirmations.~~ ✅ **DONE 2026-05-20.** `Modal.confirm` migrated to `modal.confirm` from `App.useApp()` in commit `8bf3b0b2`. Halt+Resume cycle smoked end-to-end on throwaway market IMP-931C4BD8; modal opens, reason typed, OK confirmed, gateway state transitioned, sentinel captured 0 warnings.
10. ~~**Full back-office page sweep** — Phase 3 only verified settlements.~~ ✅ **DONE 2026-05-20.** Swept 9 App-Router pages: `/dashboard`, `/users`, `/audit-logs`, `/campaigns`, `/content`, `/reports`, `/leaderboards`, `/loyalty`, `/loyalty/settings`. All render under v5 with the P8 theme. Sentinel: 0 AntD context warnings, 0 runtime JS errors. Note: `/users`, `/audit-logs`, `/loyalty/settings` show "Failed to load …" because the gateway's `registerAdminRoutes()` is defined but never wired into `RegisterRoutes()` — separate gateway-side follow-up, not a v5 regression.

### Larger debt opportunities (separate effort)

11. **Office test suite** — original plan noted "existing test coverage is thin." 🟡 **Partial fix in commit `d99f5076` (2026-05-20).** Vitest + happy-dom scaffold landed with 7 passing tests for the new `adminFetch` helper (~400ms runtime). Path forward is now mechanical — future tests go under `tests/*.test.{ts,tsx}` and import from `"vitest"`. **Remaining:** write tests for the bridges (Tabs items, PageHeader, ConfigProvider reduced-motion) and component smoke tests. Estimated 0.5-1 day for the bridge coverage; existing legacy `__tests__/*.test.*` Jest files still hang and can be migrated incrementally.
12. **AntD 5 → 6 (when it arrives)** — v5 is now the active line. Drop `@ant-design/v5-patch-for-react-19` once a v5 minor includes the React 19 fixes natively (or v6 lands). Track via AntD changelog.

### Deferred non-blockers from QA report

13. **F2 prod parity** — login route mints `csrf_token` locally; behavior in prod (where `AUTH_COOKIE_SECURE=true`) was not exercised on a real admin mutation. **Fix:** when the deploy gate opens, perform one disposable admin write in prod (NOT a settle — pick lifecycle halt+resume on a non-active demo market).
