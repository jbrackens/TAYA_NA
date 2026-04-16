import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      background: string;
      surface: string;
      card: string;
      border: string;
      text: string;
      textSecondary: string;
      live: string;
      finished: string;
      error: string;
      upcoming: string;
      cancelled: string;
      accentGreen: string;
      accentBlue: string;
    };
    typography: {
      fontFamily: string;
      xlarge: { fontSize: string; lineHeight: string; fontWeight: number };
      large: { fontSize: string; lineHeight: string; fontWeight: number };
      medium: { fontSize: string; lineHeight: string; fontWeight: number };
      base: { fontSize: string; lineHeight: string; fontWeight: number };
      small: { fontSize: string; lineHeight: string; fontWeight: number };
      weights: {
        regular: number;
        medium: number;
        semibold: number;
        bold: number;
      };
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    breakpoints: {
      sm: string;
      md: string;
      lg: string;
    };
    motion: {
      fast: string;
      pulse: string;
    };
    radius: {
      sm: string;
      md: string;
      lg: string;
      full: string;
    };
  }
}
