export * from './colors';
export * from './typography';
export * from './spacing';
export * from './breakpoints';

export const motion = {
  fast: '0.2s ease',
  pulse: '2s ease-in-out infinite',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  full: '9999px',
} as const;

export type Motion = typeof motion;
export type Radius = typeof radius;
