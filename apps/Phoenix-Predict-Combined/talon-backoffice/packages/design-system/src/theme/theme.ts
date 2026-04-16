import { DefaultTheme } from 'styled-components';
import { colors, typography, spacing, breakpoints, motion, radius } from '../tokens';

export const darkTheme: DefaultTheme = {
  colors: {
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    border: colors.border,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    live: colors.status.live,
    finished: colors.status.finished,
    error: colors.status.error,
    upcoming: colors.status.upcoming,
    cancelled: colors.status.cancelled,
    accentGreen: colors.accent.green,
    accentBlue: colors.accent.blue,
  },
  typography: {
    fontFamily: typography.fontFamily,
    xlarge: typography.sizes.xlarge,
    large: typography.sizes.large,
    medium: typography.sizes.medium,
    base: typography.sizes.base,
    small: typography.sizes.small,
    weights: typography.weights,
  },
  spacing: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  },
  breakpoints: {
    sm: breakpoints.sm,
    md: breakpoints.md,
    lg: breakpoints.lg,
  },
  motion: {
    fast: motion.fast,
    pulse: motion.pulse,
  },
  radius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    full: radius.full,
  },
};

export type ThemeType = typeof darkTheme;
