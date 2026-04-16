export const typography = {
  fontFamily: "'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  sizes: {
    xlarge: {
      fontSize: '56px',
      lineHeight: '64px',
      fontWeight: 700,
    },
    large: {
      fontSize: '28px',
      lineHeight: '36px',
      fontWeight: 600,
    },
    medium: {
      fontSize: '18px',
      lineHeight: '24px',
      fontWeight: 500,
    },
    base: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },
    small: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 400,
    },
  },

  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export type Typography = typeof typography;
