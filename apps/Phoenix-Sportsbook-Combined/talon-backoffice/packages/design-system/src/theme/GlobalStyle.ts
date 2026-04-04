import { createGlobalStyle } from 'styled-components';
import { ThemeType } from './theme';

const GlobalStyle = createGlobalStyle<{ theme: ThemeType }>`
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html,
  body {
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    font-size: 14px;
    line-height: 20px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    padding: 0;
  }

  a {
    color: ${({ theme }) => theme.colors.accentBlue};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  button {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
  }

  input,
  select,
  textarea {
    font-family: ${({ theme }) => theme.typography.fontFamily};
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius.sm};

    &:hover {
      background: ${({ theme }) => theme.colors.textSecondary};
    }
  }

  /* Selection styles */
  ::selection {
    background-color: ${({ theme }) => theme.colors.accentBlue};
    color: ${({ theme }) => theme.colors.text};
  }

  ::-moz-selection {
    background-color: ${({ theme }) => theme.colors.accentBlue};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default GlobalStyle;
