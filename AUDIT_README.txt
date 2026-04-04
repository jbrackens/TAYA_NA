================================================================================
PHOENIX SPORTSBOOK FRONTEND - IMPORT/EXPORT AUDIT RESULTS
================================================================================

Generated: 2026-04-03
Auditor: Comprehensive Automated Audit System
Scope: 51 files across 8 categories (legacy components, pages, APIs, websocket, store, hooks)

================================================================================
DOCUMENT INDEX
================================================================================

1. AUDIT_README.txt (this file)
   - Overview and navigation

2. AUDIT_REPORT.txt
   - Detailed 262-line report with full findings
   - Category-by-category breakdown
   - Summary statistics

3. AUDIT_SUMMARY.md
   - Executive summary in markdown
   - Key findings with impact assessment
   - Remediation priorities

4. FIXES_NEEDED.txt
   - Line-by-line fixes for all 11 issues
   - Exact import statements to change
   - Testing checklist

================================================================================
QUICK SUMMARY
================================================================================

TOTAL FILES AUDITED: 51
FILES WITH ISSUES: 9 (17.6%)
FILES OK: 42 (82.4%)

CRITICAL ISSUES: 11 total
  - PHANTOM_PACKAGE: 9 instances (all same root cause: @phoenix-api/client)
  - MISSING_USE_CLIENT: 2 instances (hook files)
  - BROKEN_IMPORTS: 0
  - ORPHANED_FILES: 2 (architectural)
  - DUPLICATE_COMPONENTS: 2 (architectural)

================================================================================
ROOT CAUSE ANALYSIS
================================================================================

PRIMARY ISSUE: Phantom Package @phoenix-api/client

The codebase imports from @phoenix-api/client, which does not exist in node_modules.
The correct package is @phoenix-ui/api-client, which IS installed and contains all
required exports (PhoenixApiClient, PhoenixWebSocketClient, etc.).

This is a simple find-and-replace issue:
  OLD: import { ... } from '@phoenix-api/client';
  NEW: import { ... } from '@phoenix-ui/api-client';

AFFECTED: 9 files
  - 7 legacy components
  - 2 hook files

IMPACT: Compilation fails at module resolution stage

================================================================================
SECONDARY ISSUE: Missing 'use client' Directives

Two hook files use React hooks (useState, useCallback, useEffect) but lack
the 'use client' directive required by Next.js 13+ App Router.

AFFECTED: 2 files
  - hooks/useApi.ts
  - hooks/useLiveData.ts

FIX: Add "use client';" as first line of each file

IMPACT: Runtime errors when these hooks are called from Server Components

================================================================================
ARCHITECTURAL ISSUES (CLEANUP)
================================================================================

1. DUPLICATE COMPONENTS (should consolidate):
   - SportSidebar.tsx vs SportsSidebar.tsx
   - Betslip.tsx vs BetslipPanel.tsx

2. ORPHANED COMPONENTS (should integrate or remove):
   - FeaturedMatches.tsx
   - SessionTimer.tsx

See AUDIT_SUMMARY.md for detailed analysis.

================================================================================
WHAT PASSED
================================================================================

✓ All Store Slices Properly Wired
  12/12 Redux slices correctly registered in store.ts

✓ All Relative Imports Valid
  No broken relative imports (./components, ../lib, ../hooks)

✓ WebSocket Modules Intact
  All websocket files have valid cross-references

✓ API Client Hub Complete
  All specialized clients properly exported from index.ts

================================================================================
RECOMMENDED REMEDIATION ORDER
================================================================================

1. FIX PHANTOM IMPORTS (9 files)
   - Replace @phoenix-api/client with @phoenix-ui/api-client
   - See FIXES_NEEDED.txt for exact line numbers
   - Estimated time: 5 minutes

2. ADD 'use client' DIRECTIVES (2 files)
   - Add to hooks/useApi.ts and hooks/useLiveData.ts
   - See FIXES_NEEDED.txt for exact changes
   - Estimated time: 1 minute

3. VERIFY FIXES
   - Run: npm run build (or npx tsc --noEmit)
   - No compilation errors should remain
   - Estimated time: 2 minutes

4. OPTIONAL: CONSOLIDATE DUPLICATES (0-2 hours)
   - Decide: Keep SportSidebar or SportsSidebar?
   - Decide: Keep Betslip or BetslipPanel?
   - Remove orphaned components

================================================================================
IMPACT ASSESSMENT
================================================================================

BEFORE FIXES:
- Project will NOT compile (module resolution failure)
- 9 files cannot be imported
- 2 hook files will cause runtime errors

AFTER PRIORITY 1-2 FIXES:
- All 51 audited files will compile correctly
- All imports will resolve successfully
- No runtime errors from hooks
- Project is buildable and runnable

AFTER PRIORITY 3 FIXES:
- Codebase is cleaner (no duplicates)
- No orphaned dead code
- Better maintainability

================================================================================
VERIFICATION COMMANDS
================================================================================

Check phantom imports still exist:
  grep -r "@phoenix-api/client" app/

After fixes, should return: (no matches)

Check use client directives added:
  head -1 app/hooks/useApi.ts
  head -1 app/hooks/useLiveData.ts

After fixes, should both output: 'use client';

Run full type check:
  npx tsc --noEmit

After fixes, should pass with no errors

Run Next.js build:
  npm run build

After fixes, should succeed completely

================================================================================
FILES SAVED FOR REFERENCE
================================================================================

This audit generated 4 reference documents in the repo root:

1. /AUDIT_README.txt (this file)
2. /AUDIT_REPORT.txt (full detailed report)
3. /AUDIT_SUMMARY.md (executive summary)
4. /FIXES_NEEDED.txt (exact fixes required)

All files are plain text/markdown for easy review and sharing.

================================================================================
CONTACT / NOTES
================================================================================

Audit Scope: Next.js 13.5 App Router sportsbook frontend
Base Directory: /sessions/dreamy-bold-ptolemy/mnt/PhoenixBotRevival/apps/
  Phoenix-Sportsbook-Combined/phoenix-frontend/packages/app/app/

Files Checked:
  - All legacy components in /components
  - All pages in /auth, /bets, /live, /match, /profile, /sports, /responsible-gaming
  - All API routes in /api
  - All websocket modules in /lib/websocket
  - All store slices in /lib/store
  - All API clients in /lib/api
  - All custom hooks in /hooks

No Harmful Changes: This audit is read-only. No files were modified.

================================================================================
