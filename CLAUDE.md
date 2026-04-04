# Phoenix Sportsbook Platform — CLAUDE.md

## Project Overview

This is the Phoenix Sportsbook platform — a real-time sports betting application with a player-facing frontend and an admin backoffice. Both are active projects under active development. Neither is "legacy" — treat both with equal care.

## Repository Structure

```
PhoenixBotRevival/
├── apps/Phoenix-Sportsbook-Combined/
│   ├── phoenix-frontend/packages/app/     ← Player app (Next.js 13.5 App Router)
│   ├── talon-backoffice/packages/app/     ← Admin backoffice (Next.js 13.5 App Router)
│   ├── phoenix-backend/                   ← Go backend services
│   └── go-platform/                       ← Go platform layer
├── services/                              ← Microservices
├── libs/                                  ← Shared libraries
├── scripts/                               ← Build/deploy scripts
└── configs/                               ← Environment configs
```

## GitHub Repos

- Monorepo: https://github.com/jbrackens/PhoenixBotRevival
- GitHub user: jbrackens

## Critical Rules

### Never Do These

1. **Never give placeholder paths.** Always use the real, full paths from this project. The workspace is at `/Users/john/Sandbox/PhoenixBotRevival/`. Never use `~/path-to/...` or `your-project/...`.
2. **Never call any part of this project "legacy" or suggest skipping it.** Both the player app and the backoffice are active.
3. **Never use `@phoenix-ui/design-system` imports in `app/`** — it uses styled-components and causes webpack hangs. Use inline components or Tailwind.
4. **Never introduce `console.log/warn/error` in production code.** Use the structured `logger` from `app/lib/logger.ts`.
5. **Never use `any` type.** Use `unknown`, proper interfaces, or `Record<string, unknown>`.
6. **Never suppress TypeScript errors** with `@ts-nocheck`, `@ts-ignore`, or `as any`.
7. **Never declare something "done" if it uses mock/hardcoded data.** Mark it STUBBED in the feature manifest.

### Always Do These

1. **Run `gate.sh`** before declaring any task complete (in the backoffice: `./gate.sh`).
2. **Use real paths** when giving the user instructions. The Mac workspace is `/Users/john/Sandbox/PhoenixBotRevival/`.
3. **Fix errors, don't work around them.** Zero bug policy. No shortcuts.
4. **Update FEATURE_MANIFEST.json** when implementing or modifying features.

## Tech Stack — Player App

**Path:** `apps/Phoenix-Sportsbook-Combined/phoenix-frontend/packages/app/`

- **Framework:** Next.js 13.5 with App Router (`app/` directory)
- **React:** 18 — `React.FC` does NOT include `children` prop; add explicitly
- **State:** Redux Toolkit v1 (NOT v2) — use `TypedUseSelectorHook`, NOT `.withTypes()`
- **Store types:** `app/lib/store/hooks.ts` for `useAppDispatch` / `useAppSelector`
- **Server state:** React Query
- **i18n:** react-i18next with custom fetch backend loading from `/static/locales/{lng}/{ns}.json`
- **i18n config:** `app/lib/i18n/config.ts` — namespaces defined in `NAMESPACES` array
- **Locales:** `public/static/locales/en/` (60 namespace files), `de/` for German
- **Styling:** Tailwind CSS + inline styles (NO styled-components in app/)
- **Logging:** `app/lib/logger.ts` — structured logger (dev: console with `[context]` prefix, prod: no-op)
- **WebSocket:** `app/lib/websocket/` — real-time odds, fixtures, bets
- **API clients:** `app/lib/api/` — one client per domain (auth, betting, events, markets, wallet, user, compliance)
- **Analytics:** Google Tag Manager (GTM-PJSSBJG)
- **Testing:** Node.js built-in test runner (`node:test`) for zero-dependency tests; legacy jest tests exist
- **Tests location:** `app/__tests__/`

## Tech Stack — Backoffice

**Path:** `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/`

- Same Next.js 13.5 / React 18 / App Router setup as the player app
- Has its own `CLAUDE.md` with gate.sh rules at `talon-backoffice/packages/app/CLAUDE.md`
- Same quality standards apply — zero bugs, no shortcuts

## Key Patterns

### Error Handling

```typescript
// CORRECT — catch with unknown, type-check before use
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error('Context', 'What failed', message);
}

// WRONG — never use any in catch blocks
catch (err: any) { ... }
```

### Stable Callback Refs (avoid stale closures in useEffect)

```typescript
const onCloseRef = useRef(onClose);
useEffect(() => { onCloseRef.current = onClose; });

useEffect(() => {
  // Use onCloseRef.current instead of onClose
  return () => onCloseRef.current?.();
}, [open]); // onClose NOT in deps
```

### Timer Types

```typescript
// CORRECT — works in both Node and browser
const timer: ReturnType<typeof setTimeout> = setTimeout(...);

// WRONG — NodeJS.Timeout doesn't exist in browser
const timer: NodeJS.Timeout = setTimeout(...);
```

### Logger Usage

```typescript
import { logger } from '../lib/logger';

// Methods: error, warn, info, debug
// Signature: (context: string, message: string, data?: unknown)
logger.error('Auth', 'Session check failed', err);
logger.info('WebSocket', 'Connected to channel', channelId);
```

### i18n

```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('namespace'); // namespace must be in NAMESPACES array in config.ts
// Add new keys to public/static/locales/en/<namespace>.json AND de/<namespace>.json
```

### Redux Store Typing

```typescript
// In components — use typed hooks from app/lib/store/hooks.ts
import { useAppDispatch, useAppSelector } from '../lib/store/hooks';

// In non-component files (websocket handlers, etc.) — import AppDispatch type
// Do NOT import from store.ts directly (circular dependency risk)
```

### localStorage Safety

```typescript
// Always guard for SSR
if (typeof window !== 'undefined') {
  localStorage.getItem('key');
}
```

## Local Development

### Prerequisites
- Node.js 18+
- Go backend running on port 18080

### Player App
```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend/packages/app
npm install --legacy-peer-deps
NEXT_PUBLIC_API_URL=http://localhost:18080 npm run dev
# Runs on localhost:3000
```

### Backoffice
```bash
cd /Users/john/Sandbox/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app
npm install --legacy-peer-deps
npm run dev
# Runs on localhost:3001
```

### Known macOS Issue — Brotli
If `npm install` or `yarn install` crashes with `libbrotlicommon.1.dylib` code signature error, fix with:
```bash
codesign --force --sign - /opt/homebrew/lib/libbrotlicommon.1.dylib
codesign --force --sign - /opt/homebrew/lib/libbrotlidec.1.dylib
codesign --force --sign - /opt/homebrew/lib/libbrotlienc.1.dylib
```
On Intel Macs, check `/usr/local/lib/` instead of `/opt/homebrew/lib/`.

### Use npm, not yarn
Use `npm install --legacy-peer-deps` instead of `yarn install` — yarn has peer dependency conflicts with this monorepo.

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:18080    # Go backend
NEXT_PUBLIC_AUTH_URL=http://localhost:18081    # Auth service
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws    # WebSocket
NEXT_PUBLIC_SUPPORT_CHAT_URL=               # Live chat support URL
```

## Quality Standards

This project follows a zero bug, no shortcuts policy:

- 0 `any` types — use `unknown` or proper interfaces
- 0 `console.*` statements — use `logger` from `app/lib/logger.ts`
- 0 hardcoded user-facing strings — extract to i18n locale files
- 0 stale closures — use ref pattern for callbacks in useEffect
- All catch blocks use `(err: unknown)` with `instanceof Error` checks
- All locale namespaces have both EN and DE files
- gate.sh must pass before any milestone is declared complete

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
