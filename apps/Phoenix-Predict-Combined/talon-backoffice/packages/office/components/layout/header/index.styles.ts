import styled from "styled-components";
import { Layout, Menu as MenuComponent } from "antd";

// P8 office chrome (2026-04-28). Reads from the styled-components
// ThemeProvider set in pages/_app.js — see DESIGN.md §11 for the
// migration log. The earlier sportsbook-era theme passed an object
// at theme.menu with .color / .active / .activeBorder / .activeHover
// keys; the P8 theme uses theme.menu = "light" (the AntD Menu's
// theme prop) and exposes header chrome via theme.headerBg /
// theme.headerBorder. Both flat-string and object variants are
// supported here so a future theme refactor can re-introduce
// per-key overrides without touching this file.

export const Header = styled(Layout.Header)`
  display: flex;
  align-items: center;
  width: 100vw;

  background: ${(props) =>
    (props.theme as { headerBg?: string }).headerBg ||
    "var(--surface-1, #ffffff)"};
  border-bottom: 1px solid
    ${(props) =>
      (props.theme as { headerBorder?: string }).headerBorder ||
      "var(--border-1, #e5dfd2)"};
  color: var(--t1, #1a1a1a);

  position: fixed;
  z-index: 1;

  .ant-dropdown-trigger {
    cursor: pointer;
  }
`;

export const Menu = styled(MenuComponent)`
  flex-grow: 1;
  background: transparent;
  border-bottom: 0;
`;

export const LeftMenu = styled(Menu)``;

export const RightMenu = styled(Menu)`
  flex-grow: unset;
`;
