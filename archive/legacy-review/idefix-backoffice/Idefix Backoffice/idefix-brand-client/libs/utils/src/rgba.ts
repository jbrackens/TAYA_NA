export const rgba = (hex: string, alpha: number): string =>
  hex + Math.round(alpha * 255).toString(16);
