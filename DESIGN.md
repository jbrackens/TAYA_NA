# Design System: TAYA NA! Player App

## 1. Visual Theme & Atmosphere

TAYA NA! uses a dark, high-contrast sportsbook interface built around neon green brand energy. The product should feel fast, live, and technically confident rather than soft, corporate, or fintech-minimal. The UI lives on deep navy and midnight surfaces, with bright green reserved for action, state, and emphasis.

This is not a white-surface exchange aesthetic. It is a dark betting shell with a strong left rail, a compact top bar, dense event surfaces, and glowing green calls to action.

**Key Characteristics:**
- Deep navy shell with layered dark panels
- Neon green (`#39ff14`) as the primary brand and action color
- IBM Plex Sans for all UI copy and interface structure
- Orbitron reserved for digital-scoreboard brand details only
- Bright text hierarchy on dark surfaces with accessible muted copy
- Rounded geometry, but still technical and compact
- Subtle green glow and dark elevation for focus areas

## 2. Color Palette & Roles

### Brand
- **Brand Green** (`#39ff14`): Primary CTA, active state, links, highlight values
- **Brand Green Dark** (`#2ed600`): Gradient partner, button depth, hover transitions
- **Brand Glow** (`rgba(57,255,20,0.3)`): CTA shadow and emphasis glow
- **Brand Soft Fill** (`rgba(57,255,20,0.08)`): Subtle highlight backgrounds
- **Brand Border** (`rgba(57,255,20,0.14)`): Focused card and auth borders

### Core Dark Surfaces
- **Page Background** (`#0b0e1c`): Primary app background
- **Auth Gradient Top** (`#0a0d18`): Auth background start
- **Auth Gradient Bottom** (`#0d1120`): Auth background end
- **Panel Base** (`#0f1225`): Sidebar, header, and major panels
- **Panel Deep** (`#111631`): Sport chips and secondary cards
- **Panel Alt** (`#161a35`): Hover states and raised dark surfaces
- **Panel Accent** (`#1a2040`): Active nav states and selected tabs
- **Border Dark** (`#1a1f3a`): Default divider and panel border
- **Border Strong** (`#1e2243`): Hero and large-panel border

### Text
- **Primary Text** (`#f8fafc`): Headings, primary controls, top-level labels
- **Body Text** (`#e2e8f0`): Standard readable UI copy
- **Accessible Muted Text** (`#D3D3D3`): Secondary labels and descriptions on dark surfaces
- **Dark CTA Text** (`#101114`): Text on bright green buttons

### Support Colors
- **Live Green** (`#22c55e`): Live indicators and positive status
- **Live Fill** (`rgba(34,197,94,0.12)`): Live badge background
- **Alert Red** (`#ef4444`): Errors, destructive states, live-dot alternative
- **Info Blue** (`#7fb8ff`): Secondary links on auth and static pages

## 3. Typography Rules

### Font Families
- **UI / Body / Navigation**: `IBM Plex Sans`, fallbacks: `-apple-system, BlinkMacSystemFont, sans-serif`
- **Digital Accent Only**: `Orbitron` for badge-style scoreboard branding moments only

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero Heading | IBM Plex Sans | 40px | 900 | 1.15 | -0.03em |
| Page Title | IBM Plex Sans | 28px | 700–800 | 1.2 | -0.02em |
| Section Title | IBM Plex Sans | 18px–20px | 800 | 1.2 | -0.01em to -0.02em |
| Card Heading | IBM Plex Sans | 16px | 700 | 1.3 | normal |
| Body | IBM Plex Sans | 14px–16px | 400 | 1.6–1.7 | normal |
| Button | IBM Plex Sans | 13px–16px | 600–700 | 1.2–1.4 | normal |
| Label / Micro | IBM Plex Sans | 10px–12px | 700 | 1.2 | 0.05em–0.12em uppercase |
| Badge Mark | Orbitron | 20px | 900 | 1.0 | slight negative tracking |

## 4. Component System

### Shell Layout
- Fixed left sidebar on desktop
- Sticky top header with compact tabs and actions
- Content canvas offset by the sidebar width
- Betslip as a right-side overlay sheet on desktop and full-width overlay on mobile
- Auth routes must not render the sportsbook shell behind them

### Sidebar
- Width: `220px` desktop
- Compact mode: `60px` on tablet only
- Mobile: horizontal scrollable nav row, not a hidden or leaking fixed rail
- Background: `#0f1225`
- Active item: `#1a2040` with green text and green accent edge
- Section labels use muted accessible text, uppercase micro styling

### Logo Badge
- Size: `36px x 36px`
- Radius: `6px`
- Background: `linear-gradient(135deg, #39ff14, #2ed600)`
- Shadow: `0 2px 8px rgba(46, 214, 0, 0.5)`
- Mark style: custom segmented `TN` scoreboard monogram
- Use Orbitron only when a typographic digital accent is required; prefer the custom mark

### Header Bar
- Height: `56px` desktop
- Background: `#0f1225`
- Border-bottom: `1px solid #1a1f3a`
- Tabs are compact rounded rectangles, not pills
- Search control uses dark panel styling with subtle border treatment
- Login and Join Now buttons sit on the right; Join Now is the stronger CTA

### Buttons

**Primary CTA**
- Background: `linear-gradient(135deg, #39ff14, #2ed600)`
- Text: `#101114`
- Radius: `8px`–`10px`
- Shadow: `0 4px 12px rgba(57,255,20,0.25)` to `0 4px 20px rgba(57,255,20,0.3)`

**Secondary / Outline CTA**
- Background: `transparent`
- Border: `1.5px solid #39ff14`
- Text: `#39ff14`
- Hover: soft green fill

**Dark Utility Button**
- Background: `#111933` or `#161a35`
- Border: dark blue or dark border tone
- Text: white or light-blue support text depending on context

### Cards
- Standard radius: `14px`–`18px`
- Background: layered dark gradients or flat dark surfaces
- Border: `1px solid #1a1f3a` or `rgba(57,255,20,0.14)` when elevated/focused
- Hover behavior should be subtle lift, border brighten, or soft glow, never loud motion

### Landing Hero
- Large dark gradient panel
- Radius: `20px`
- Padding: `40px`–`56px`
- Contains eyebrow, bold heading, supporting copy, CTA pair, and compact stat row
- Use a restrained radial green glow in the corner, not a busy background effect

### Feature Cards
- Dark cards with technical feel, not generic SaaS cards
- Use icon tiles with subtle green fill and border
- Copy should be concise and narrower for better readability
- Small lift on hover is acceptable

### Search / Discovery
- Search bars use dark translucent backgrounds with subtle borders
- Discovery pills can use stronger rounding when they behave as filters
- Active filter state uses green text with soft green fill and low glow

### Auth Card
- Auth view is a dedicated centered panel on a clean dark gradient field
- Card width: roughly `440px`
- Radius: `18px`
- Border: `1px solid rgba(57,255,20,0.14)`
- Shadow: deep dark elevation, subtle internal top highlight
- Include concise supporting copy and a small brand/state eyebrow above the heading

### Betslip
- Desktop: fixed side sheet `380px` wide
- Mobile: full-width overlay sheet
- Background: `#0f1225`
- Headers and tabs use compact sportsbook UI language, not large modal styling

## 5. Spacing, Radius, and Density

### Spacing Scale
Use: `4px, 6px, 8px, 10px, 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px, 40px, 56px`

### Border Radius
- `6px`: logo badge, compact technical elements
- `8px`: small buttons, tabs, inputs
- `10px`: primary CTA buttons
- `12px`: compact inner elements
- `14px`: cards
- `18px`: premium cards and discovery modules
- `20px`: hero/final CTA panels
- `999px`: badges and pill filters only when interaction requires it

### Density Guidance
- Sportsbook UI should feel compact and efficient, not airy and editorial
- Keep nav, market rows, and odds controls tight
- Save larger whitespace for auth and landing hero moments only

## 6. Motion & Elevation

### Elevation
- **CTA Glow**: `0 4px 12px rgba(57,255,20,0.25)`
- **Hero Glow**: radial highlight only, low-opacity
- **Card Lift**: `0 20px 36px rgba(0,0,0,0.18)` on hover when appropriate
- **Auth Card**: `0 28px 60px rgba(0,0,0,0.45)` with subtle inset highlight

### Motion
- Keep interactions fast and short: `0.15s`–`0.2s`
- Preferred effects: border brighten, 1–2px lift, soft opacity shifts
- Avoid large motion, bouncy easing, or generic animation overload

## 7. Responsive Rules

### Breakpoints
- `375px`: mobile baseline
- `768px`: mobile/tablet transition
- `1024px`: tablet/desktop compact-sidebar threshold
- `1280px+`: full desktop layout

### Mobile Behavior
- Sidebar becomes a horizontal top strip, not a fixed vertical rail
- Header wraps cleanly into stacked rows
- Search may collapse or hide when necessary
- Hero CTA row stacks vertically on small screens
- Betslip becomes full-width overlay

### Tablet Behavior
- Compact icon-only sidebar is allowed from `769px` to `1024px`
- Desktop content offset should match compact sidebar width in this range only

## 8. Do's and Don'ts

### Do
- Use neon green sparingly for action and emphasis
- Keep the interface dark, layered, and sportsbook-native
- Use `#D3D3D3` for muted readable copy on dark surfaces
- Make auth pages feel focused and separate from the app shell
- Prefer technical, deliberate shapes over soft fintech polish

### Don't
- Don’t revert to bright white-page exchange styling in the player app
- Don’t use dark muted text like `#94a3b8` on dark surfaces
- Don’t hide mobile navigation without an intentional replacement
- Don’t overuse Orbitron; it is an accent, not the UI body font
- Don’t introduce purple bias, glass overload, or generic AI-SaaS card layouts

## 9. Canonical Reference Surfaces

Use these shipped surfaces as the truth source for the current player design language:
- `/app/layout.tsx` for shell, sidebar, header, and responsive behavior
- `/app/auth/login/page.tsx` for auth treatment
- `/app/components/LandingPage.tsx` for marketing/guest tone and CTA hierarchy
- `/app/page.tsx` for discovery engine patterns

## 10. Agent Prompt Guide

### Quick Reference
- Background: `#0b0e1c`
- Shell panels: `#0f1225`, `#161a35`, `#1a2040`
- Brand green: `#39ff14`
- Brand gradient partner: `#2ed600`
- Primary text: `#f8fafc`
- Muted text: `#D3D3D3`
- CTA text on green: `#101114`

### Example Prompt
- "Design a dark sportsbook screen for TAYA NA! using IBM Plex Sans, neon green CTAs, compact nav density, deep navy surfaces, and restrained green glow. Keep the layout fast, technical, and betting-native rather than fintech-white or generic SaaS." 
