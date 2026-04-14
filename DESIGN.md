# TAYA NA! Unified Design System

> One brand. Two surfaces. Shared foundations, app-specific extensions.

This document governs both the **Player App** (port 3000 — sportsbook, betting, account) and the **Admin Backoffice** (port 3001 — operator dashboard, risk, user management). Every color, font, spacing value, and component pattern lives here.

---

## 1. Visual Theme & Atmosphere

TAYA NA! uses a dark, high-contrast interface built around neon green brand energy. Both apps share the same DNA — deep navy surfaces, IBM Plex Sans typography, green-as-action — but diverge in density, accent intensity, and component patterns.

### Player App

The sportsbook should feel **fast, live, and technically confident**. Dense event surfaces, a strong left rail, glowing green calls to action, and compact betting controls. This is a dark betting shell, not a fintech dashboard.

### Admin Backoffice

The operator dashboard should feel **calm, structured, and data-clear**. Slightly more spacious than the player app, with a softer green accent that won't fatigue operators during 8-hour sessions. Tables, metric strips, and form layouts take priority over marketing moments.

**Key Shared Characteristics:**
- Deep navy shell with layered dark panels
- IBM Plex Sans for all UI text (Orbitron as digital accent in player only)
- Bright text hierarchy on dark surfaces with accessible muted copy
- Semantic color roles: success, danger, info, warning, live, suspended
- Rounded geometry scaled per app context

---

## 2. Color Palette

### 2.1 Shared Foundations

These colors are identical across both apps:

#### Core Dark Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `page-bg` | `#0b0e1c` | Primary app background |
| `panel-base` | `#0f1225` | Sidebar, header, major panels |
| `panel-deep` | `#111631` | Secondary cards, table headers |
| `panel-alt` | `#161a35` | Hover states, raised surfaces |
| `panel-accent` | `#1a2040` | Active nav, selected tabs |
| `border-default` | `#1a1f3a` | Dividers, panel borders |
| `border-strong` | `#1e2243` | Hero borders, emphasis borders |
| `border-hover` | `#2a3050` | Hover state borders |

#### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f8fafc` | Headings, primary labels |
| `text-body` | `#e2e8f0` | Standard readable copy |
| `text-muted` | `#D3D3D3` | Secondary labels, descriptions |
| `text-dim` | `#64748b` | Placeholders, disabled text |
| `text-cta-dark` | `#101114` | Text on bright green buttons |

#### Semantic Status

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22c55e` | Positive status, balance up |
| `success-fill` | `rgba(34,197,94,0.12)` | Success badge backgrounds |
| `danger` | `#ef4444` | Errors, destructive actions |
| `danger-fill` | `rgba(239,68,68,0.12)` | Error badge backgrounds |
| `danger-text` | `#f87171` | Readable error text on dark |
| `info` | `#4a7eff` | Links, odds highlights |
| `info-fill` | `rgba(74,126,255,0.12)` | Info badge backgrounds |
| `warning` | `#fbbf24` | Caution states, pending |
| `warning-fill` | `rgba(251,191,36,0.12)` | Warning badge backgrounds |
| `live` | `#22c55e` | Live match indicators |
| `live-fill` | `rgba(34,197,94,0.12)` | Live badge background |

### 2.2 Player App — Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-green` | `#39ff14` | Primary CTA, active state, links |
| `brand-green-dark` | `#2ed600` | Gradient partner, button depth |
| `brand-glow` | `rgba(57,255,20,0.3)` | CTA shadow, emphasis glow |
| `brand-soft-fill` | `rgba(57,255,20,0.08)` | Subtle highlight backgrounds |
| `brand-border` | `rgba(57,255,20,0.14)` | Focused card borders |
| `auth-gradient-top` | `#0a0d18` | Auth background start |
| `auth-gradient-bottom` | `#0d1120` | Auth background end |

**Player gradient:** `linear-gradient(135deg, #39ff14, #2ed600)`

### 2.3 Admin Backoffice — Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `admin-green` | `#4ade80` | Primary CTA, active state |
| `admin-green-dark` | `#22c55e` | Gradient partner, hover depth |
| `admin-glow` | `rgba(74,222,128,0.2)` | Subtle CTA glow |
| `admin-soft-fill` | `rgba(74,222,128,0.06)` | Highlight backgrounds |
| `admin-border` | `rgba(74,222,128,0.12)` | Focused element borders |

**Admin gradient:** `linear-gradient(135deg, #4ade80, #22c55e)`

**Why two greens?** The player's `#39ff14` neon is high-energy and attention-grabbing — perfect for "Place Bet" CTAs that compete with live match data. The admin's `#4ade80` is a warmer, softer cousin that won't strain operator eyes during long shifts. Same green family, different intensity. Both read as "TAYA NA green" to anyone who sees them.

### 2.4 Sportsbook-Specific Status Colors

These apply to the player app only:

| Token | Hex | Usage |
|-------|-----|-------|
| `price-up` | `#22c55e` | Odds moved in bettor's favor |
| `price-up-fill` | `rgba(34,197,94,0.15)` | Price-up cell flash |
| `price-down` | `#ef4444` | Odds moved against bettor |
| `price-down-fill` | `rgba(239,68,68,0.15)` | Price-down cell flash |
| `suspended` | `#fbbf24` | Market suspended indicator |
| `suspended-fill` | `rgba(251,191,36,0.12)` | Suspended badge background |

---

## 3. Typography

### 3.1 Font Families (Both Apps)

```
UI / Body / Navigation:  'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif
Monospace (data/IDs):    'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace
Digital Accent (player): 'Orbitron' — badge-style scoreboard branding only
```

**Weights loaded:** 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

Player app additionally loads 800 (extrabold) and 900 (black) for hero headings.

### 3.2 Player App Typography Scale

| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Hero Heading | 40px | 900 | 1.15 | -0.03em |
| Page Title | 28px | 700–800 | 1.2 | -0.02em |
| Section Title | 18–20px | 800 | 1.2 | -0.01em to -0.02em |
| Card Heading | 16px | 700 | 1.3 | normal |
| Body | 14–16px | 400 | 1.6–1.7 | normal |
| Button | 13–16px | 600–700 | 1.2–1.4 | normal |
| Label / Micro | 10–12px | 700 | 1.2 | 0.05em–0.12em uppercase |
| Badge Mark | 20px Orbitron | 900 | 1.0 | slight negative |

### 3.3 Admin Backoffice Typography Scale

| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Page Title | 24px | 700 | 1.3 | -0.01em |
| Section Title | 18px | 600 | 1.3 | -0.01em |
| Card Heading | 15px | 600 | 1.3 | normal |
| Body | 14px | 400 | 1.6 | normal |
| Table Cell | 13px | 400 | 1.4 | normal |
| Table Header | 12px | 600 | 1.3 | 0.04em uppercase |
| Button | 13–14px | 600 | 1.3 | normal |
| Label / Caption | 11–12px | 500 | 1.3 | 0.02em |
| Metric Value | 28px | 700 | 1.1 | -0.02em |
| Metric Label | 12px | 500 | 1.3 | 0.02em |
| Mono Data | 13px IBM Plex Mono | 400 | 1.4 | normal |

**Key differences:** Admin titles are slightly smaller (24px vs 28px) and use semibold (600) instead of extrabold (800). Admin never uses weights above 700 — the heavier weights are reserved for the player app's marketing moments.

---

## 4. Spacing, Radius & Density

### 4.1 Shared Spacing Scale

`2px, 4px, 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px, 40px, 48px, 56px, 64px`

### 4.2 App-Specific Defaults

| Context | Player App | Admin Backoffice |
|---------|-----------|------------------|
| Card padding | 16px | 20px |
| Section gap | 12–16px | 16–20px |
| Table row height | — | 44px |
| Table cell padding | — | 12px 16px |
| Form field gap | 12px | 16px |
| Form section gap | 20px | 24px |
| Page padding (desktop) | 20–24px | 24–32px |
| Page padding (mobile) | 16px | 16px |
| Metric card padding | — | 20px 24px |

### 4.3 Border Radius

| Token | Player App | Admin Backoffice |
|-------|-----------|------------------|
| `radius-xs` | 4px | 3px |
| `radius-sm` | 6px | 4px |
| `radius-md` | 8px | 6px |
| `radius-lg` | 10px | 8px |
| `radius-xl` | 14px | 10px |
| `radius-2xl` | 18px | 12px |
| `radius-hero` | 20px | — |
| `radius-pill` | 999px | 999px |

**Guidance:** Player uses larger radii for a softer, consumer-facing feel. Admin uses tighter radii (2-4px smaller per step) for a structured, data-tool aesthetic. Both feel "TAYA NA" — the admin just tightens the geometry.

### 4.4 Density Philosophy

**Player:** Compact and efficient — betting-native. Nav rows, odds controls, and market data should feel tight. Save whitespace for auth and hero moments.

**Admin:** Structured and scannable. Data tables and metric grids need breathing room. Operators scan for anomalies — generous cell padding and clear row separation help. Still dense compared to consumer SaaS, but not as tight as the betslip.

---

## 5. Component System — Shared

### 5.1 Shell Layout

Both apps use the same structural shell:

- **Fixed left sidebar** on desktop
- **Sticky top header** with actions
- **Content canvas** offset by sidebar width
- **Mobile:** sidebar collapses to horizontal nav strip

### 5.2 Sidebar

| Property | Player App | Admin Backoffice |
|----------|-----------|------------------|
| Width (desktop) | 220px | 240px |
| Width (compact) | 60px | 60px |
| Background | `#0f1225` | `#0f1225` |
| Active item bg | `#1a2040` | `#1a2040` |
| Active item text | `#39ff14` | `#4ade80` |
| Active accent edge | 3px left green bar | 3px left green bar |
| Section labels | `#D3D3D3`, 10px, uppercase | `#64748b`, 11px, uppercase |
| Mobile behavior | Horizontal scrollable strip | Hamburger overlay |

**Admin sidebar is 20px wider** to accommodate longer labels ("Risk Management", "Terms & Conditions", "Responsible Gaming").

### 5.3 Header Bar

| Property | Player App | Admin Backoffice |
|----------|-----------|------------------|
| Height | 56px | 56px |
| Background | `#0f1225` | `#0f1225` |
| Border-bottom | `1px solid #1a1f3a` | `1px solid #1a1f3a` |
| Right items | Search, odds format, language, auth | Search, notifications, user menu |

### 5.4 Buttons

#### Primary CTA

| Property | Player App | Admin Backoffice |
|----------|-----------|------------------|
| Background | `linear-gradient(135deg, #39ff14, #2ed600)` | `linear-gradient(135deg, #4ade80, #22c55e)` |
| Text | `#101114` | `#101114` |
| Radius | 8–10px | 6–8px |
| Shadow | `0 4px 12px rgba(57,255,20,0.25)` | `0 4px 12px rgba(74,222,128,0.15)` |
| Font weight | 600–700 | 600 |

#### Secondary / Outline

| Property | Player App | Admin Backoffice |
|----------|-----------|------------------|
| Border | `1.5px solid #39ff14` | `1.5px solid #4ade80` |
| Text | `#39ff14` | `#4ade80` |
| Hover | Soft green fill | Soft green fill |

#### Destructive

Both apps: `background: transparent`, `border: 1.5px solid #ef4444`, `color: #f87171`. Hover fills with `rgba(239,68,68,0.12)`.

#### Utility / Ghost

Both apps: `background: #161a35`, `border: 1px solid #1a1f3a`, `color: #e2e8f0`.

### 5.5 Cards

| Property | Player App | Admin Backoffice |
|----------|-----------|------------------|
| Radius | 14–18px | 10–12px |
| Background | `#0f1225` or dark gradient | `#0f1225` flat |
| Border | `1px solid #1a1f3a` | `1px solid #1a1f3a` |
| Padding | 16px | 20px |
| Hover | Subtle lift + border brighten | Border brighten only |

### 5.6 Badges & Status Chips

Both apps use the same badge system:

```
background: {status}-fill
color: {status} (or white for dark fills)
border-radius: 999px (pill) or 6px (rectangular)
padding: 2px 8px
font-size: 11px
font-weight: 600
text-transform: uppercase
letter-spacing: 0.04em
```

Status variants: `success`, `danger`, `warning`, `info`, `live`, `suspended` (player only).

---

## 6. Component System — Player App Only

### 6.1 Betslip

- **Desktop:** Fixed right sheet, 380px wide
- **Mobile:** Full-width bottom overlay
- **Background:** `#0f1225`
- **Tab bar:** Compact sportsbook UI, not modal styling
- **Selection card:** Dark card with green accent on left edge
- **Stake input:** Dark surface with subtle border, green focus ring

### 6.2 Odds Pills

Six states:
1. **Default:** `bg: #1a1f3a`, `color: #e2e8f0`, `radius: 6px`
2. **Hover:** `border-color: #39ff14`, `bg: #161a35`
3. **Selected:** `bg: #4f46e5`, `color: white`
4. **Suspended:** `bg: #1a1f3a`, `color: #64748b`, `cursor: not-allowed`
5. **Price Up:** Flash `bg: rgba(34,197,94,0.15)` for 1.5s
6. **Price Down:** Flash `bg: rgba(239,68,68,0.15)` for 1.5s

### 6.3 Fixture Cards

- Radius: 14px
- Status indicator: 8px colored dot (live green, upcoming neon, finished grey)
- Team names: 14px, weight 600
- Score: 18px, weight 700 (for live matches)
- Bet buttons row below match info (home / draw / away)

### 6.4 Landing Hero

- Large dark gradient panel
- Radius: 20px
- Padding: 40–56px
- Eyebrow + bold heading + copy + CTA pair + stat row
- Restrained radial green glow in one corner
- Border: `1px solid #1e2243`

### 6.5 Auth Card

- Centered on clean dark gradient field
- Width: ~440px
- Radius: 18px
- Border: `1px solid rgba(57,255,20,0.14)`
- Shadow: `0 28px 60px rgba(0,0,0,0.45)`
- Green glow highlight subtle, not overpowering

### 6.6 Logo — TN Speech Bubble

The TAYA NA! logo is a neon green speech-bubble containing bold italic "TN." with spark accents radiating from the top-right corner.

**Source files:**
- `public/logo-tn.svg` — Canonical vector source
- `public/logo-tn.png` — Transparent PNG for web usage

**Logo anatomy:**
- **Bubble:** Rounded rectangle with curved tail at bottom-left. Neon green (`#39ff14`) outline stroke.
- **Letters:** "TN" in bold italic white, tight kerning, with subtle drop shadow for depth.
- **Period:** Neon green (`#39ff14`) dot to the right of "N".
- **Sparks:** Three radiating accent lines from top-right in `#39ff14`.
- **Background:** Must be placed on dark surfaces — the logo has a transparent/dark backdrop.

**Usage sizes:**

| Context | Size | Notes |
|---------|------|-------|
| Sidebar brand mark | 36x36px | Both apps |
| Page header | 40x40px | Next to "TAYA NA!" text |
| Auth card | 48x48px | Centered above heading |
| Marketing / hero | 80x80px | With drop-shadow glow |
| Favicon | 32x32px | Simplified (bubble + TN only) |
| Social / OG image | 200x200px | Full detail |

**Don'ts:**
- Never render the logo with Orbitron text — the SVG is the canonical mark
- Never stretch or skew the logo — use equal width/height
- Never remove the green glow filter — it's part of the brand identity
- Never place the logo on a green background — it must sit on dark surfaces

---

## 7. Component System — Admin Backoffice Only

### 7.1 Data Tables

Data tables are the backbone of the admin UI. Design for scannability.

```
Table container:
  background: #0f1225
  border: 1px solid #1a1f3a
  border-radius: 10px
  overflow: hidden

Table header:
  background: #111631
  border-bottom: 1px solid #1a1f3a
  padding: 12px 16px
  font-size: 12px
  font-weight: 600
  color: #D3D3D3
  text-transform: uppercase
  letter-spacing: 0.04em

Table row:
  padding: 12px 16px
  border-bottom: 1px solid rgba(26,31,58,0.5)
  font-size: 13px
  color: #e2e8f0
  height: 44px

Table row hover:
  background: #161a35

Table row selected:
  background: rgba(74,222,128,0.06)
  border-left: 3px solid #4ade80

Sortable column header:
  cursor: pointer
  hover: color #f8fafc with sort indicator

Pagination:
  background: #111631
  border-top: 1px solid #1a1f3a
  padding: 12px 16px
  font-size: 12px
```

### 7.2 Metric Cards (KPI Strip)

Displayed as a 4-6 card horizontal row at the top of dashboard pages.

```
Metric card:
  background: #0f1225
  border: 1px solid #1a1f3a
  border-radius: 10px
  padding: 20px 24px
  min-width: 200px

Metric value:
  font-size: 28px
  font-weight: 700
  color: #f8fafc
  letter-spacing: -0.02em
  font-variant-numeric: tabular-nums

Metric label:
  font-size: 12px
  font-weight: 500
  color: #D3D3D3
  margin-bottom: 4px

Metric trend (up):
  font-size: 12px
  color: #22c55e
  display: inline with arrow icon

Metric trend (down):
  font-size: 12px
  color: #ef4444
  display: inline with arrow icon
```

### 7.3 Form Layouts

```
Form section:
  gap: 24px between sections
  16px between fields within a section

Form label:
  font-size: 13px
  font-weight: 500
  color: #D3D3D3
  margin-bottom: 6px

Text input:
  background: #0b0e1c
  border: 1px solid #1a1f3a
  border-radius: 6px
  padding: 10px 14px
  font-size: 14px
  color: #e2e8f0
  height: 40px

Text input focus:
  border-color: #4ade80
  box-shadow: 0 0 0 2px rgba(74,222,128,0.15)

Select / dropdown:
  Same styling as text input
  Dropdown menu: background #111631, border 1px solid #1a1f3a

Checkbox / toggle:
  Active color: #4ade80
  Track background: #1a1f3a
  Knob: white
```

### 7.4 Admin Navigation Tabs

For sub-page navigation within admin sections (e.g., Risk > Open Bets | Settled | Flagged):

```
Tab bar:
  background: transparent
  border-bottom: 1px solid #1a1f3a
  gap: 0

Tab (inactive):
  padding: 10px 16px
  font-size: 13px
  font-weight: 500
  color: #D3D3D3
  border-bottom: 2px solid transparent

Tab (active):
  color: #4ade80
  border-bottom: 2px solid #4ade80
  font-weight: 600

Tab (hover):
  color: #e2e8f0
  background: rgba(74,222,128,0.04)
```

### 7.5 Admin Detail Panels

For user detail views, bet inspection, transaction drill-downs:

```
Detail panel:
  background: #0f1225
  border: 1px solid #1a1f3a
  border-radius: 10px
  padding: 24px

Detail header:
  font-size: 18px
  font-weight: 600
  color: #f8fafc
  border-bottom: 1px solid #1a1f3a
  padding-bottom: 16px
  margin-bottom: 20px

Key-value row:
  display: flex
  justify-content: space-between
  padding: 8px 0
  border-bottom: 1px solid rgba(26,31,58,0.3)

Key (label):
  font-size: 13px
  color: #D3D3D3
  font-weight: 500

Value:
  font-size: 13px
  color: #e2e8f0
  font-weight: 400
  text-align: right
```

### 7.6 Toast / Notification

Both apps use the same toast system:

```
Toast container:
  position: fixed, top-right
  z-index: 60

Toast card:
  background: #111631
  border: 1px solid #1a1f3a
  border-left: 4px solid {status-color}
  border-radius: 8px (admin) / 10px (player)
  padding: 14px 16px
  shadow: 0 8px 16px rgba(0,0,0,0.3)
  font-size: 13px
  max-width: 380px
  animation: slide-in 0.2s ease-out
```

---

## 8. Iconography

### 8.0 Icon Library

Both apps use **[Lucide Icons](https://lucide.dev)** (`lucide-react` in React components). Lucide provides clean, consistent, open-source SVG icons with a uniform 24x24 grid. Never use emoji, raster images, or icon fonts for UI icons.

### Icon Sizing

| Context | Size | Stroke Width |
|---------|------|-------------|
| Sidebar nav items | 18px | 1.75px |
| Icon tiles (feature cards, sport chips) | 20px | 1.75px |
| Inline with text (buttons, labels) | 16px | 1.75px |
| Page headers, empty states | 24px | 1.75px |
| Hero / marketing moments | 28-32px | 1.5px |

### Icon Color Rules

- **Default:** Inherit text color (`currentColor`)
- **Active state:** Brand green (`#39ff14` player, `#4ade80` admin)
- **Muted:** `#D3D3D3` or `#64748b`
- **Status:** Use semantic colors (success green, danger red, warning amber, info blue)
- **Never** use multi-color icons or apply gradients to icon strokes

### Icon Tiles

When icons appear in feature cards or sport selectors, wrap them in a tile container:

```
Player icon tile:
  width: 40px, height: 40px
  background: rgba(57,255,20,0.08)
  border: 1px solid rgba(57,255,20,0.14)
  border-radius: 10px
  display: flex, align-items: center, justify-content: center

Admin icon tile:
  width: 40px, height: 40px
  background: rgba(74,222,128,0.06)
  border: 1px solid rgba(74,222,128,0.12)
  border-radius: 8px
  display: flex, align-items: center, justify-content: center
```

### Key Icon Mappings

Sport icons use **custom inline SVGs** that depict the actual ball/equipment for each sport. General UI icons use Lucide.

| UI Element | Icon Source | Notes |
|-----------|------------|-------|
| Football/Soccer | Custom SVG (pentagon-panel ball) | Inline SVG, not Lucide |
| Basketball | Custom SVG (ball with seam lines) | Inline SVG, not Lucide |
| Tennis | Custom SVG (ball with curved seam) | Inline SVG, not Lucide |
| Baseball | Custom SVG (ball with stitching) | Inline SVG, not Lucide |
| Live matches | `zap` | |
| Favorites | `star` | Filled variant when active |
| Search | `search` | |
| Settings | `settings` | |
| User/Profile | `user` | |
| Users (admin) | `users` | |
| Dashboard | `layout-dashboard` | |
| Wallet/Cashier | `wallet` or `credit-card` | |
| Risk management | `shield-alert` | |
| Audit logs | `scroll-text` | |
| Notifications | `bell` | |
| Rewards/Trophies | `trophy` | |
| Leaderboard | `bar-chart-3` | |
| Responsible gaming | `shield-check` | |
| Reports | `file-text` | |
| Logout | `log-out` | |
| Close/Remove | `x` | |
| Chevron/Expand | `chevron-down` | |
| External link | `external-link` | |
| Trend up | `trending-up` | Paired with success color |
| Trend down | `trending-down` | Paired with danger color |

---

## 9. Elevation & Motion

### 9.1 Shadow Scale (Both Apps)

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 2px 4px rgba(0,0,0,0.2)` | Dropdowns, tooltips |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.3)` | Floating panels, popovers |
| `shadow-lg` | `0 8px 16px rgba(0,0,0,0.3)` | Modals, overlays |
| `shadow-panel` | `0 20px 40px rgba(0,0,0,0.16)` | Major surface panels |
| `shadow-hero` | `0 24px 48px rgba(0,0,0,0.2)` | Player hero section |

### 9.2 Glow (App-Specific)

| Token | Player | Admin |
|-------|--------|-------|
| `glow-cta` | `0 4px 12px rgba(57,255,20,0.25)` | `0 4px 12px rgba(74,222,128,0.15)` |
| `glow-focus` | `0 0 0 2px rgba(57,255,20,0.25)` | `0 0 0 2px rgba(74,222,128,0.15)` |
| `glow-hero` | Radial green highlight, low opacity | — |

### 9.3 Motion

- **Transition duration:** 0.15s–0.2s (both apps)
- **Easing:** `ease` for most, `ease-out` for entrances
- **Preferred effects:** border brighten, 1-2px lift, soft opacity shifts
- **Avoid:** large motion, bouncy easing, generic animation overload
- **Admin-specific:** Table row hover transitions should be instant (no delay)

---

## 10. Responsive Breakpoints

### 10.1 Shared Breakpoints

| Token | Width | Notes |
|-------|-------|-------|
| `mobile` | 375px | Mobile baseline |
| `sm` | 640px | Small devices |
| `md` | 768px | Tablet transition |
| `lg` | 1024px | Desktop compact sidebar |
| `xl` | 1200px | Full desktop |
| `2xl` | 1440px | Wide desktop, max content |

### 10.2 Player App Responsive

- **Mobile:** Sidebar becomes horizontal scrollable strip. Hero stacks vertically. Betslip is full-width overlay.
- **Tablet (769-1024px):** Compact icon-only sidebar (60px). Content offset matches.
- **Desktop (1024px+):** Full sidebar (220px). Betslip right panel (380px).

### 10.3 Admin Responsive

- **Mobile (<768px):** Sidebar hidden behind hamburger overlay. Tables become card layouts. Metric strip stacks to 2-column grid.
- **Tablet (768-1024px):** Compact sidebar (60px). Tables remain tabular but may horizontally scroll.
- **Desktop (1024px+):** Full sidebar (240px). Full data tables. Metric strip 4-6 across.

---

## 11. Layout Dimensions

| Token | Player App | Admin Backoffice |
|-------|-----------|------------------|
| `sidebar-width` | 220px | 240px |
| `sidebar-compact` | 60px | 60px |
| `header-height` | 56px | 56px |
| `betslip-width` | 380px | — |
| `content-max-width` | 1440px | 1440px |
| `table-row-height` | — | 44px |

---

## 12. Z-Index Scale (Both Apps)

| Token | Value |
|-------|-------|
| `z-topbar` | 10 |
| `z-sidebar` | 20 |
| `z-betslip-backdrop` | 29 |
| `z-betslip` | 30 |
| `z-overlay` | 40 |
| `z-modal` | 50 |
| `z-toast` | 60 |

---

## 13. Do's and Don'ts

### Shared — Always Do

- Use the semantic status palette (success/danger/info/warning) instead of arbitrary colors
- Use IBM Plex Sans for all text — weight-driven hierarchy, not size-driven
- Keep the interface dark and layered — no white surfaces
- Use `#D3D3D3` for muted readable copy on dark surfaces (never `#94a3b8`)
- Guard green for action and emphasis — never use it for body text or large fills
- Keep transitions fast (0.15–0.2s) — the product should feel snappy

### Shared — Never Do

- Don't introduce bright white page styling in either app
- Don't use `#94a3b8` or similar dark muted text on dark surfaces (fails contrast)
- Don't suppress TypeScript errors to ship faster
- Don't add `console.log` — use the structured logger
- Don't introduce purple bias, glass morphism, or generic AI-SaaS patterns
- Don't use emoji as icons anywhere in the UI — use Lucide SVG icons exclusively

### Player App — Do

- Keep the sportsbook feeling compact and dense
- Use neon green (`#39ff14`) boldly for CTAs and live indicators
- Make auth pages feel focused and separate from the app shell
- Use Orbitron sparingly — accent only, never body font
- Design for fast scanning: odds pills, dense fixture rows, compact nav

### Player App — Don't

- Don't add editorial whitespace to betting surfaces
- Don't soften the green — `#39ff14` is the brand
- Don't hide mobile navigation without a replacement
- Don't overuse gradient backgrounds — restrain to hero and CTA moments

### Admin Backoffice — Do

- Use the softer green (`#4ade80`) for all accent and action states
- Give data tables and forms more breathing room than the player app
- Use tighter border radii (6-10px) for a professional data-tool feel
- Design for operators who stare at this 8 hours — reduce visual fatigue
- Use IBM Plex Mono for transaction IDs, amounts, and reference numbers

### Admin Backoffice — Don't

- Don't use neon green (`#39ff14`) — it's too intense for admin context
- Don't match the player app's compact density for tables and forms
- Don't use hero-sized radii (18-20px) on admin cards
- Don't add marketing/promotional visual patterns to admin screens
- Don't use Orbitron in the admin app — it's player-only

---

## 14. Canonical Reference Surfaces

### Player App

| Surface | File |
|---------|------|
| Shell, sidebar, header, responsive | `app/layout.tsx` |
| Auth treatment | `app/auth/login/page.tsx` |
| Marketing/guest tone, CTA hierarchy | `app/components/LandingPage.tsx` |
| Discovery engine, authenticated home | `app/page.tsx` |
| Betslip interaction | `app/components/BetslipPanel.tsx` |
| Sport fixtures | `app/components/FixtureList.tsx` |

### Admin Backoffice

| Surface | File |
|---------|------|
| Design tokens | `app/lib/theme.ts` |
| Shell layout | `app/layout.tsx` |
| Global styles | `app/globals.css` |
| Legacy theme (migration reference) | `pxp-theme/theme.less` |

---

## 15. Agent Prompt Guide

### Player App Quick Reference

```
Background:       #0b0e1c
Shell panels:     #0f1225, #161a35, #1a2040
Brand green:      #39ff14
Gradient partner: #2ed600
Primary text:     #f8fafc
Muted text:       #D3D3D3
CTA text on green: #101114
```

**Prompt:** "Design a dark sportsbook screen for TAYA NA! using IBM Plex Sans, neon green CTAs, compact nav density, deep navy surfaces, and restrained green glow. Keep the layout fast, technical, and betting-native."

### Admin Backoffice Quick Reference

```
Background:       #0b0e1c
Shell panels:     #0f1225, #111631, #161a35
Admin green:      #4ade80
Gradient partner: #22c55e
Primary text:     #f8fafc
Muted text:       #D3D3D3
CTA text on green: #101114
Mono font:        IBM Plex Mono (for data values)
```

**Prompt:** "Design a dark admin dashboard screen for TAYA NA! backoffice using IBM Plex Sans, softer green (#4ade80) accents, data tables with generous row height, metric cards at top, and structured 10px-radius panels. Keep it calm, scannable, and operator-friendly."

---

## 16. Migration Notes

### Backoffice Legacy → Unified System

The backoffice has two codebases:
- **`packages/app/`** (modern) — already uses IBM Plex Sans, dark navy palette, and green accents via `theme.ts`. Swap `#39ff14` references to `#4ade80` for admin-specific accent.
- **`packages/office/`** (legacy) — uses Barlow, styled-components, Ant Design v4, and a purple-grey palette (`#1a1a2e`, `#2d2d44`). When migrating components to `app/`, adopt the unified token system. Do not port the old palette.

### Token Migration Checklist

- [ ] Replace Barlow font imports with IBM Plex Sans
- [ ] Replace `#1a1a2e` backgrounds with `#0b0e1c` / `#0f1225`
- [ ] Replace `#2d2d44` surfaces with `#111631` / `#161a35`
- [ ] Replace `#4caf50` green with `#4ade80`
- [ ] Replace `#2196f3` blue with `#4a7eff`
- [ ] Replace `#f5c842` gold with `#fbbf24`
- [ ] Update border-radius from Ant Design defaults to admin radius scale
- [ ] Remove Ant Design ConfigProvider theme overrides in favor of CSS tokens
