# Phoenix Backoffice Integration Guide

## Overview

This document describes how the new component-based architecture has been integrated into the App Router pages. All major pages now use the reusable components created in the previous phase.

## Updated Pages

### 1. Dashboard Page (`/dashboard`)
**File**: `/app/dashboard/page.tsx`
**Components Used**: 
- `DashboardLayout` - Responsive grid container
- `RevenueWidget` - Revenue metrics with sparkline
- `ActiveBetsWidget` - Active bets counter
- `LiveMatchesWidget` - Live matches by sport
- `RiskAlertsWidget` - Risk alert feed
- `RecentActivityWidget` - Recent admin actions timeline

**Status**: ✅ Fully integrated with sample data

---

### 2. Live Trading Page (`/trading`)
**File**: `/app/trading/page.tsx`
**Components Used**:
- `TradingBoard` - Grid of fixture cards with status
- `MarketManagement` - Market table with suspend/resume toggles

**Key Features**:
- Real-time fixture selection
- Market odds adjustment
- Market suspension/activation
- Uses client-side state management for live updates

**Status**: ✅ Fully integrated with sample fixtures and markets

---

### 3. Risk Management Page (`/risk-management`)
**File**: `/app/risk-management/page.tsx`
**Components Used**:
- `RiskDashboard` - Overview with metrics and top fixtures
- `PlayerRiskTable` - Sortable/paginated punter risk scores

**Key Features**:
- Risk distribution visualization
- Player risk scoring with color coding
- Risk segment filtering
- Top liability fixtures display

**Status**: ✅ Fully integrated with sample player data

---

### 4. User Management Pages

#### Users Listing (`/users`)
**File**: `/app/users/page.tsx`
**Components Used**:
- `PunterSearch` - Search and filter interface with DataTable

**Key Features**:
- Text search by name/email
- Status filtering (active/suspended/verified/unverified)
- Risk segment filtering
- Sortable columns
- Pagination

**Status**: ✅ Fully integrated with sample punters

#### User Detail (`/users/[id]`)
**File**: `/app/users/[id]/page.tsx`
**Components Used**:
- `PunterProfile` - Full profile with stats and info
- `AccountActions` - Admin action panel

**Key Features**:
- Avatar and verification badges
- Account statistics (balance, bets, stake, win rate)
- Recent bet history
- Account actions (suspend, reset password, set limits)
- Uses confirmation modal for dangerous actions

**Status**: ✅ Fully integrated with sample user data

---

### 5. Audit Logs Page (`/audit-logs`)
**File**: `/app/audit-logs/page.tsx`
**Components Used**:
- `AuditLogTable` - DataTable with expandable JSON diff viewer

**Key Features**:
- Searchable audit log entries
- Filter by action type (create, update, delete, login, logout)
- Filter by resource type (user, fixture, market, odds, alert)
- Expandable rows showing before/after JSON changes
- Pagination with 10 entries per page

**Status**: ✅ Fully integrated with sample audit logs

---

### 6. Reports Page (`/reports`)
**File**: `/app/reports/page.tsx`
**Components Used**:
- Custom styled components for report cards
- Standard Card component from @phoenix-ui/design-system

**Key Features**:
- Key metrics display (revenue, bets, users, avg bet)
- Period filtering (7 days, 30 days, 90 days, month, year)
- Available reports grid with generate buttons
- Generated reports list with view/download options

**Status**: ✅ Fully integrated with sample metrics and reports

---

## Component Architecture

### Client vs Server Components

All updated pages are now **client-side** ('use client') to support:
- Real-time state management
- Event handling (clicks, filters, selections)
- Dynamic data updates without page reload
- Confirmation dialogs and modals

### Data Flow Pattern

Each page follows this pattern:

```typescript
'use client';

// 1. Import components
import { ComponentName } from '../components/feature';

// 2. Initialize sample/API data
const [data, setData] = useState([]);

// 3. Load data in useEffect
useEffect(() => {
  // Fetch from API or use sample data
}, []);

// 4. Render with component
<ComponentName 
  data={data}
  onAction={handleAction}
/>
```

---

## Shared Components Usage

### DataTable
Used internally by multiple components for displaying tabular data with:
- Sortable columns
- Pagination (default 10 per page)
- Custom cell rendering
- Row click handlers

### ConfirmModal
Used by AccountActions and other components for confirming dangerous operations:
- Danger/warning variants
- Impact summary display
- Loading state during confirmation
- Custom button text

### Styling
All components use:
- Dark theme with consistent colors (#1a1a2e, #16213e, #0f3460, #4a7eff)
- Responsive design (3 columns desktop, 2 tablet, 1 mobile)
- Barlow font from Google Fonts
- Smooth transitions and hover effects

---

## Sample Data

Each page includes SAMPLE_* constants with realistic data for testing:

- `SAMPLE_FIXTURES` - Trading fixtures
- `SAMPLE_MARKETS` - Market data
- `SAMPLE_PLAYERS` - Risk data
- `SAMPLE_PUNTERS` - User data
- `SAMPLE_LOGS` - Audit log entries
- `SAMPLE_METRICS` - Report metrics
- `SAMPLE_REPORTS` - Generated reports

Replace these with actual API calls using the `useAdminApi` hook.

---

## Next Steps for Production

### 1. API Integration
Replace sample data with real API calls:

```typescript
const { data: fixtures, loading } = useAdminApi<FixtureData[]>(
  '/api/admin/fixtures'
);
```

### 2. WebSocket Integration
Enable real-time updates in TradingBoard and LiveMatchesWidget:

```typescript
const { isConnected, subscribe } = useTradingWebSocket({
  url: 'wss://api.example.com/ws/trading'
});
```

### 3. Navigation
Update all links to use Next.js Link component:

```typescript
import Link from 'next/link';

<Link href={`/users/${punter.id}`}>
  {punter.name}
</Link>
```

### 4. Error Handling
Add error boundaries and error states:

```typescript
if (error) {
  return <ErrorBanner message={error.message} />;
}
```

### 5. Loading States
Utilize component loading props:

```typescript
<PunterSearch punters={punters} isLoading={isLoading} />
```

---

## File Structure

```
app/
├── dashboard/
│   └── page.tsx                    (Dashboard with widgets)
├── trading/
│   └── page.tsx                    (TradingBoard + MarketManagement)
├── risk-management/
│   └── page.tsx                    (RiskDashboard + PlayerRiskTable)
│   ├── fixtures/
│   │   ├── page.tsx               (Fixture list)
│   │   └── [id]/page.tsx          (Fixture detail)
│   └── markets/
│       └── [id]/page.tsx          (Market detail)
├── users/
│   ├── page.tsx                    (PunterSearch)
│   └── [id]/page.tsx              (PunterProfile + AccountActions)
├── audit-logs/
│   └── page.tsx                    (AuditLogTable)
├── reports/
│   └── page.tsx                    (Report cards and metrics)
├── components/
│   ├── dashboard/                  (6 components)
│   ├── trading/                    (4 components)
│   ├── risk-management/            (3 components)
│   ├── users/                      (3 components)
│   ├── audit/                      (1 component)
│   └── shared/                     (2 components)
└── hooks/                          (3 hooks)
```

---

## Testing Checklist

- [x] Dashboard renders with all widgets
- [x] Trading page allows fixture selection and market suspension
- [x] Risk management shows player risk scores
- [x] User search filters and displays punters
- [x] User detail shows profile and account actions
- [x] Audit logs display with filtering
- [x] Reports show metrics and available reports
- [ ] API integration with real endpoints
- [ ] WebSocket connections for live updates
- [ ] Error handling and error states
- [ ] Loading states during data fetching
- [ ] Responsive design on mobile/tablet

---

## Documentation References

- **COMPONENTS.md** - Detailed API documentation for every component
- **IMPLEMENTATION_SUMMARY.md** - Initial implementation overview
- **INTEGRATION_GUIDE.md** - This file

---

**Last Updated**: April 2026
**Status**: Integration Complete - Ready for API Connection
