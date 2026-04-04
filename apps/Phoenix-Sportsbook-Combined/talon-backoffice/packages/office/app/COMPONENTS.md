# Phoenix Backoffice Components

## Overview

This directory contains the React components for the Phoenix Sportsbook Backoffice. All components use styled-components for dark-themed styling and are built with React 18 and TypeScript 5.3.

## Directory Structure

```
app/
├── components/
│   ├── dashboard/          # Dashboard widgets and layout
│   ├── trading/            # Live trading components
│   ├── risk-management/    # Risk analysis and monitoring
│   ├── users/              # Punter/user management
│   ├── audit/              # Audit logging
│   └── shared/             # Reusable UI components
├── hooks/                  # Custom React hooks
└── pages/                  # Next.js App Router pages
```

## Components

### Dashboard Components (`dashboard/`)

#### DashboardLayout
- **Purpose**: Grid container for dashboard widgets
- **Props**: `children: React.ReactNode`
- **Responsive**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Usage**: Wrap dashboard widgets

#### RevenueWidget
- **Purpose**: Displays revenue metrics with sparkline
- **Props**:
  - `todayRevenue: number`
  - `weekRevenue: number`
  - `mtdRevenue: number`
  - `changePercent?: number` (default: 12)
  - `sparklineData?: number[]`
- **Features**: Period breakdown, SVG sparkline chart

#### ActiveBetsWidget
- **Purpose**: Shows active bets count and settlement rate
- **Props**:
  - `activeBets: number`
  - `settledLastHour: number`
  - `settlementRate: number`
  - `onViewBets?: () => void`

#### LiveMatchesWidget
- **Purpose**: Lists live matches by sport with WebSocket support
- **Props**:
  - `matches?: Array<{ sport: string; count: number }>`
  - `onSportClick?: (sport: string) => void`
- **Features**: Real-time WebSocket updates, connection status indicator

#### RiskAlertsWidget
- **Purpose**: Displays risk alerts with severity levels
- **Props**:
  - `alerts?: Array<{ id, severity, description, timestamp, action? }>`
- **Features**: Severity color coding, action buttons, time formatting

#### RecentActivityWidget
- **Purpose**: Timeline of recent admin actions
- **Props**:
  - `activities?: Array<{ id, actor, action, description, timestamp, icon? }>`
- **Features**: Activity icons, timeline layout, formatted timestamps

### Trading Components (`trading/`)

#### TradingBoard
- **Purpose**: Grid of live fixture cards
- **Props**:
  - `fixtures?: FixtureData[]`
  - `selectedFixtureId?: string`
  - `onFixtureSelect?: (fixture) => void`
- **Features**: Status badges, real-time WebSocket updates, responsive layout

#### MarketManagement
- **Purpose**: Table of markets for a fixture with suspension toggle
- **Props**:
  - `markets?: MarketData[]`
  - `onMarketToggle?: (marketId) => void`
  - `onViewSelections?: (marketId) => void`
- **Features**: Status display, liability highlighting, quick actions

#### SelectionOddsEditor
- **Purpose**: Inline odds editing for a selection
- **Props**:
  - `selection: SelectionData`
  - `onSave?: (selectionId, newOdds) => void`
  - `onCancel?: () => void`
  - `isSaving?: boolean`
- **Features**: +/- buttons, manual input, bet/liability display

#### SettlementPanel
- **Purpose**: Market settlement UI with winner selection
- **Props**:
  - `selections?: SettlementSelection[]`
  - `onSettle?: (selectedIds) => void`
  - `onCancel?: () => void`
  - `isLoading?: boolean`
- **Features**: Checkbox selection, impact summary, payout calculation

### Risk Management Components (`risk-management/`)

#### RiskDashboard
- **Purpose**: Risk overview with charts and metrics
- **Props**:
  - `playerCount?: number`
  - `avgRiskScore?: number`
  - `totalLiability?: number`
  - `maxExposure?: number`
  - `topFixtures?: Array<{ id, name, liability, isHighRisk? }>`
- **Features**: Placeholder charts, metric cards, fixture list with risk indicators

#### PlayerRiskTable
- **Purpose**: Table of punters sorted by risk score
- **Props**:
  - `players?: PlayerRiskData[]`
  - `onPlayerClick?: (player) => void`
  - `isLoading?: boolean`
- **Features**: Color-coded risk scores, segment badges, sortable columns, pagination

#### LiabilityView
- **Purpose**: Tree-view breakdown of liability by fixture/market/selection
- **Props**:
  - `fixtures?: LiabilityNode[]` (recursive structure with children)
- **Features**: Expandable nodes, high-exposure highlighting, liability amounts

### User Management Components (`users/`)

#### PunterSearch
- **Purpose**: Search and filter punters
- **Props**:
  - `punters?: PunterData[]`
  - `onPunterSelect?: (punter) => void`
  - `isLoading?: boolean`
- **Features**: Text search (name/email), status dropdown, risk segment filter, date range

#### PunterProfile
- **Purpose**: Detailed punter profile with info and actions
- **Props**:
  - `punter?: PunterProfileData`
  - `onAction?: (action: string) => void`
- **Features**: Avatar, verification badges, stats display, tabbed sections

#### AccountActions
- **Purpose**: Panel of dangerous account actions
- **Props**:
  - `punterId: string`
  - `onAction?: (action: string) => void`
- **Features**: Grouped actions (suspension, security, risk management), confirmation modals

### Audit Components (`audit/`)

#### AuditLogTable
- **Purpose**: Paginated audit log with expandable details
- **Props**:
  - `logs?: AuditLogEntry[]`
  - `isLoading?: boolean`
- **Features**: Sortable columns, pagination, modal with JSON diff viewer

### Shared Components (`shared/`)

#### ConfirmModal
- **Purpose**: Reusable confirmation modal for dangerous actions
- **Props**:
  - `isOpen?: boolean`
  - `title: string`
  - `message: string`
  - `impactSummary?: string`
  - `confirmText?: string`
  - `cancelText?: string`
  - `variant?: 'danger' | 'warning' | 'info'`
  - `isLoading?: boolean`
  - `onConfirm: () => void`
  - `onCancel: () => void`
- **Features**: Centered modal, impact summary box, disabled state during loading

#### DataTable
- **Purpose**: Generic sortable, paginated data table
- **Props**:
  - `columns: ColumnDef<T>[]`
  - `data: T[]`
  - `pageSize?: number` (default: 10)
  - `onRowClick?: (row) => void`
  - `loading?: boolean`
  - `emptyMessage?: string`
- **Features**: Column sorting, pagination controls, custom cell rendering

## Hooks

### useAdminApi
- **Purpose**: HTTP API client with loading/error states
- **Returns**:
  ```typescript
  {
    data: T | null,
    loading: boolean,
    error: Error | null,
    get: (endpoint) => Promise<T | null>,
    post: (endpoint, body) => Promise<T | null>,
    put: (endpoint, body) => Promise<T | null>,
    patch: (endpoint, body) => Promise<T | null>,
    delete: (endpoint) => Promise<T | null>,
  }
  ```

### useTradingWebSocket
- **Purpose**: WebSocket connection for real-time trading updates
- **Options**:
  - `url?: string`
  - `autoConnect?: boolean` (default: true)
  - `onMessage?: (message) => void`
  - `onError?: (error) => void`
  - `onConnect?: () => void`
  - `onDisconnect?: () => void`
- **Returns**:
  ```typescript
  {
    isConnected: boolean,
    messages: WebSocketMessage[],
    send: (type, data) => void,
    subscribe: (type, handler) => () => void,
    connect: () => void,
    disconnect: () => void,
  }
  ```

### useConfirm
- **Purpose**: Manage confirmation modal state
- **Returns**:
  ```typescript
  {
    isOpen: boolean,
    title: string,
    message: string,
    impactSummary?: string,
    confirmText?: string,
    cancelText?: string,
    variant?: 'danger' | 'warning' | 'info',
    isLoading?: boolean,
    openConfirm: (options: ConfirmOptions) => void,
    closeConfirm: () => void,
    handleConfirm: () => void,
    handleCancel: () => void,
  }
  ```

## Styling

All components use styled-components with a dark theme:

- **Background**: `#1a1a2e` (page), `#16213e` (cards)
- **Borders**: `#0f3460`
- **Primary Blue**: `#4a7eff`
- **Success Green**: `#22c55e`
- **Warning Yellow**: `#fbbf24`
- **Danger Red**: `#f87171`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#a0a0a0`

## Integration Notes

1. **Client Components**: All components are marked with `'use client'` directive for client-side rendering
2. **TypeScript**: Fully typed with interfaces exported from each component
3. **Responsive**: Mobile-first design with breakpoints at 1024px and 640px
4. **Dark Theme**: Consistent dark UI using the Phoenix design system tokens
5. **No External Libraries**: Uses styled-components + React. @phoenix-ui/design-system provides base UI components

## Usage Example

```tsx
'use client';

import { DashboardLayout, RevenueWidget } from '@/app/components/dashboard';
import { useAdminApi } from '@/app/hooks';

export default function Dashboard() {
  const { data: metrics } = useAdminApi();

  return (
    <DashboardLayout>
      <RevenueWidget
        todayRevenue={12500}
        weekRevenue={85000}
        mtdRevenue={285000}
        changePercent={12}
      />
    </DashboardLayout>
  );
}
```

## File Locations

All components are located at:
- `/app/components/` - Component source files
- `/app/hooks/` - Custom hooks
- `/app/dashboard/page.tsx` - Example integration
