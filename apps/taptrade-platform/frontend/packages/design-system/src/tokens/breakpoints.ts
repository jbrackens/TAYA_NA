export const breakpoints = {
  sm: '640px',
  md: '900px',
  lg: '1200px',
} as const;

export const breakpointValues = {
  sm: 640,
  md: 900,
  lg: 1200,
} as const;

export const media = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  smDown: `@media (max-width: 639px)`,
  mdDown: `@media (max-width: 899px)`,
  lgDown: `@media (max-width: 1199px)`,
} as const;

export type Breakpoints = typeof breakpoints;
export type BreakpointValues = typeof breakpointValues;
