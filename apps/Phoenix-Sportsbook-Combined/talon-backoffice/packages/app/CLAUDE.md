# Phoenix Sportsbook Frontend — Development Rules

## Mandatory Quality Gates

Before declaring ANY phase, milestone, or task complete, you MUST run:

```bash
./gate.sh
```

The gate script checks: TypeScript errors, phantom imports, mock classes in production code, feature manifest coverage, @ts-nocheck usage, route conflicts, and next build.

**A phase is NOT complete unless gate.sh exits 0.**

If gate.sh fails, you must:
1. Fix every failure (not suppress, not work around)
2. Re-run gate.sh
3. Only then declare the phase complete

## Feature Manifest

The file `FEATURE_MANIFEST.json` is the source of truth for migration completeness. It is generated from disk scanning, not hand-written.

Rules:
- Every new feature implementation must update the manifest status from MISSING/STUBBED to REAL
- A feature is REAL only when it connects to actual API endpoints (no MockPhoenix classes, no hardcoded data, no empty method bodies)
- STUBBED means the UI exists but the backend wiring is fake — this is technical debt, not a completed feature
- MISSING means the legacy feature has no equivalent in app/ at all

## Prohibited Patterns

These patterns are gate failures. Do not introduce them:

1. **MockPhoenix classes in production code** — Use real API clients from `app/lib/api/`. Mock classes belong in test files only.
2. **@phoenix-ui/design-system imports in app/** — This package uses styled-components and causes webpack hangs. Use inline components or Tailwind.
3. **@ts-nocheck in app/ directory** — Fix the types. @ts-nocheck in legacy `components/` test files is acceptable until those tests are migrated.
4. **`typescript: { ignoreBuildErrors: true }` in next.config.js** — This must be removed once all TS errors are resolved. It masks real problems.
5. **Declaring a feature "done" when it uses hardcoded/mock data** — If the component doesn't fetch from a real API, it's STUBBED, not done.

## Architecture

- **App Router** (`app/`) is the active codebase. All new work goes here.
- **Pages Router** (`pages/`) is legacy. Do not add new pages there. Existing pages will be migrated to app/.
- **Redux Store** (`app/lib/store/`) — Redux Toolkit v1 (not v2). Use `TypedUseSelectorHook` pattern, not `.withTypes()`.
- **API Clients** (`app/lib/api/`) — One client per domain (auth, betting, events, markets, wallet, user, compliance).
- **WebSocket** (`app/lib/websocket/`) — Real service with handlers per channel.
- **React Query** (`app/lib/query/`) — For server state. Redux for client state.

## Dev Server

```bash
yarn dev
# or
npx next dev
```

The dev server MUST boot without hanging. If it hangs, check:
1. `transpilePackages` in next.config.js — do NOT include @phoenix-ui/design-system
2. Circular imports in app/lib/

## Testing

Legacy tests are under `components/*/__tests__/`. New tests should be colocated with app/ components.

Run TypeScript checks: `npx tsc --noEmit`

## No Shortcuts Policy

This project has a history of shortcuts being taken and then discovered later. To prevent this:
1. Run gate.sh before every phase completion
2. Update FEATURE_MANIFEST.json when implementing features
3. Never suppress TypeScript errors — fix them
4. Never use mock classes in production — wire real APIs
5. If something can't be done right now, mark it STUBBED in the manifest and document why
