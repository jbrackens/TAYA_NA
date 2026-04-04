import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle<any>`
  body {
    color: ${(props) => props.theme.content.mainFont};
    background-color: ${(props) => props.theme.login.background};
    height: 100%;
    overflow: hidden;
    .ant-menu-item-selected {
      border-radius: 10px;
      background-image: ${(props) => props.theme.mainSider.selected};
      background-color: transparent;
     };

    .ant-menu-submenu-popup {
      margin-left: 12px;
    }
    #toast-container-main {
      div {
        z-index: 9999;
      }
    }
  }
`;
