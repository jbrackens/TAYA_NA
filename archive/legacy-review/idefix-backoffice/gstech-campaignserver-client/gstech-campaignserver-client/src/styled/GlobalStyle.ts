import { createGlobalStyle } from "styled-components";
import reset from "styled-reset";

export const GlobalStyle = createGlobalStyle`
  ${reset};

  html {
    box-sizing: border-box;
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }

  body, * {
    font-family: 'Rubik', sans-serif;
  }
  
  a {
    text-decoration: none;
  }

  button {
    :focus-visible {
    &::after {
      content: "";
      display: block;
      position: absolute;
      border-radius: 12px;
      top: -6px;
      left: -6px;
      right: -6px;
      bottom: -6px;
      background: transparent;
      box-shadow: inset 0px 0px 0px 2px ${({ theme }) => theme.palette.black};
    }
  }
  }
 
  input::-webkit-outer-spin-button, 
  input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
} 

  div#root {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    background: ${({ theme }) => theme.palette.whiteDirty};
  }
`;
