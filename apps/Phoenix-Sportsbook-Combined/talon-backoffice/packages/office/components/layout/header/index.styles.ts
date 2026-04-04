import styled from "styled-components";
import { Layout, Menu as MenuComponent } from "antd";

const extractMenuTheme = (props: any) => props.theme.menu || {};

export const Header = styled(Layout.Header)`
  display: flex;
  align-items: center;
  width: 100vw;

  ${(props) =>
    extractMenuTheme(props).color &&
    `
        background: ${extractMenuTheme(props).color};
    `}

  position: fixed;
  z-index: 1;

  .ant-dropdown-trigger {
    cursor: pointer;
  }
`;

export const Menu = styled(MenuComponent)`
  flex-grow: 1;

  ${(props) =>
    props.theme.color &&
    `
        background: ${props.theme.color};
        border-bottom: 0;

        &>.ant-menu-item-selected {
          color: ${props.theme.active} !important;
          border-color: ${props.theme.activeBorder} !important;

          &.ant-menu-item-active {
            color: ${props.theme.activeHover} !important;
            border-color: ${props.theme.activeBorder} !important;
  
            a {
              color: ${props.theme.activeHover};
            }
          }

          a {
            color: ${props.theme.active};
          }
        }


    `}
`;

export const LeftMenu = styled(Menu)``;

export const RightMenu = styled(Menu)`
  flex-grow: unset;
`;
