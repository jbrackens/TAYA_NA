/**
 * Phoenix Sportsbook — Design Tokens
 * ====================================
 * Single source of truth for colors, spacing, typography, and shadows.
 * Import this instead of using inline hex values.
 *
 * Usage:
 *   import { colors, spacing, font, radius, shadow } from '../lib/theme';
 *   style={{ background: colors.surface, padding: spacing.md }}
 */

// ── Brand ──
export const brand = {
  primary: '#f97316',       // Orange — primary actions, active states
  primaryHover: 'rgba(249,115,22,0.1)',
  primaryGlow: 'rgba(249,115,22,0.25)',
  gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
  danger: '#ef4444',        // Red — live badges, destructive
  dangerBg: '#7f1d1d',
  dangerText: '#f87171',
  success: '#22c55e',       // Green — balance, profit, wins
  successBg: 'rgba(34,197,94,0.1)',
  successBorder: '#22c55e30',
  info: '#4a7eff',          // Blue — odds, links
  warning: '#fbbf24',       // Amber — warnings
} as const;

// ── Surfaces & Backgrounds ──
export const colors = {
  // Backgrounds (dark → light)
  bgDeep: '#0a0e1a',       // Deepest background
  bgBase: '#0b0e1c',       // Body / input backgrounds
  bgSurface: '#0f1225',    // Cards, sidebar, header, betslip
  bgElevated: '#111631',   // Hover states, table headers
  bgActive: '#1a2040',     // Active sidebar items, selected states
  bgHover: '#161a35',      // Generic hover

  // Borders
  border: '#1a1f3a',
  borderHover: '#2a3050',

  // Text
  textPrimary: '#f8fafc',   // Headings, strong text
  textDefault: '#e2e8f0',   // Body text
  textSecondary: '#94a3b8', // Subdued text
  textMuted: '#64748b',     // Placeholders, captions
  textDim: '#4a5580',       // Section labels, disabled

  // Semantic
  ...brand,
} as const;

// ── Spacing Scale (px) ──
export const spacing = {
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
} as const;

// ── Typography ──
export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Fira Code', monospace",

  // Sizes
  xxs: '10px',
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
  '5xl': '32px',

  // Weights
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

// ── Border Radius ──
export const radius = {
  xs: '3px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '12px',
  full: '50%',
  pill: '9999px',
} as const;

// ── Shadows ──
export const shadow = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
  md: '0 4px 12px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.3)',
  glow: '0 4px 12px rgba(249, 115, 22, 0.3)',
  glowLg: '0 4px 16px rgba(249, 115, 22, 0.3)',
} as const;

// ── Transitions ──
export const transition = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow: 'all 0.3s ease',
} as const;

// ── Breakpoints ──
export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1200px',
  '2xl': '1440px',
} as const;

// ── Z-Index Scale ──
export const zIndex = {
  sidebar: 20,
  topbar: 10,
  modal: 50,
  toast: 60,
  overlay: 40,
} as const;

/**
 * Convenience object bundling all tokens for a single import:
 *   import { theme } from '../lib/theme';
 *   style={{ color: theme.colors.textPrimary }}
 */
export const theme = {
  colors,
  brand,
  spacing,
  font,
  radius,
  shadow,
  transition,
  breakpoint,
  zIndex,
} as const;

export default theme;
