import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import GlobalStyle from './GlobalStyle';
import { darkTheme } from './theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <StyledThemeProvider theme={darkTheme}>
      <GlobalStyle />
      {children}
    </StyledThemeProvider>
  );
};

export default ThemeProvider;
