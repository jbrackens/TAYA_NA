import React from 'react';
import GlobalStyle from './GlobalStyle';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <>
      <GlobalStyle />
      {children}
    </>
  );
};

export default ThemeProvider;
