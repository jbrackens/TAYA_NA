import React, { createContext } from "react";

export const ThemeContext = createContext<any>({});

type ThemeProviderProps = {
  children: React.ReactNode;
  theme: any;
};

export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
