import styled, { DefaultTheme } from "styled-components";
import { Layout, Menu as MenuComponent } from "antd";
import { PlusCircleFilled } from "@ant-design/icons";

const extractMenuTheme = (props: { theme: DefaultTheme }) => props.theme.menu || {};

export const Header = styled(Layout.Header)`
  z-index: 999;
  height: ${(props) => `${7 * props.theme.baseGutter}px`};
  @media (max-width: 1200px) {
    width: 100%;
    height: ${(props) => `${5.7 * props.theme.baseGutter}px`};
  }
  width: calc(100% - 230px);
  display: flex;
  padding: 0;
  @media (max-width: 1200px) {
    background-color: ${(props) =>
      props.theme.menu.mobileBackgroundColor} !important;
  }
  ${(props) =>
    extractMenuTheme(props).backgroundColor
      ? `
      background: ${extractMenuTheme(props).backgroundColor};
    `
      : "background: white; "}
  position: fixed;
  z-index: 1;
`;

export const Menu = styled(MenuComponent)`
  flex-grow: 1;
  text-align: center;
  display: block;
  ${(props) => {
    const menu = props.theme.menu;
    return menu?.backgroundColor
      ? `
      background: ${menu.backgroundColor};
      border-bottom: 0;
      a {
        color: ${menu.inactiveAnchor} !important;
      }
      & .ant-menu-item {
        font-size: ${1.5 * props.theme.baseGutter}px;
        :hover {
          :after {
            border-color: ${menu.activeBorder} !important;
          }
        }
      }
      &>.ant-menu-item-active {
        color: ${menu.activeHover} !important;
        border-color: ${menu.activeBorder} !important;
        a {
          color: ${menu.activeHover} !important;
        }
      }
      &>.ant-menu-item-selected {
        color: ${menu.active} !important;
          :after {
            border-color: ${menu.activeBorder} !important;
          }
        a {
          color: ${menu.active} !important;
          font-weight: bold !important;
        }
      }
    `
      : "";
  }}
`;

export const MenuCollapseButton = styled.div`
  @media (max-width: 1200px) {
    display: block;
  }
  align-self: center;
  display: none;
  color: ${(props) => props.theme.menu.menuCollapseColor};
  font-size: ${(props) => `${2 * props.theme.baseGutter}px`};
  margin-left: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  margin-right: 1.5rem;
  cursor: pointer;
`;

export const LeftMenu = styled.div`
  font-size: 16px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  flex: 3;
  @media (max-width: 1200px) {
    flex: 0;
    && > * {
      display: none;
    }
  }
`;

export const RightMenu = styled.div`
  text-align: end;
  z-index: 1;
  flex: 1;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  @media (max-width: 1200px) {
    margin-right: 0;
    right: ${(props) => `${1.5 * props.theme.baseGutter}px`};
    flex: 0;
  }
`;

export const BellAndBadgeContainer = styled.span`
  margin-right: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  display: flex;
  align-items: center;
  & .anticon {
    font-size: ${(props) => `${2.5 * props.theme.baseGutter}px`};
    color: ${(props) => props.theme.menu.bellColor};
  }
`;

export const LogoContainer = styled.div`
  height: 100%;
  img {
    max-height: ${(props) => `${5.7 * props.theme.baseGutter}px`};
  }
  @media (min-width: 1200px) {
    display: none;
  }
  @media (max-width: 576px) {
    img {
      width: ${(props) => `${12 * props.theme.baseGutter}px`};
    }
    div {
      margin-right: auto;
    }
  }
  @media (max-width: 360px) {
    img {
      width: ${(props) => `${8 * props.theme.baseGutter}px`};
    }
    div {
      margin-right: auto;
    }
  }
  display: flex;
  align-items: center;
  cursor: pointer;
  div {
    width: auto;
  }
`;

export const HideOnMobileContainer = styled.div`
  @media (max-width: 1200px) {
    display: none;
  }
  display: flex;
`;

export const DropdownContainer = styled.div`
  @media (max-width: 1200px) {
    border-left: 1px solid
      ${(props) => props.theme.menu.iconContainerBorderLeft};
  }
  height: 100%;
  display: flex;
  align-items: center;
  width: ${(props) => `${7 * props.theme.baseGutter}px`};
  justify-content: center;
  @media (max-width: 1200px) {
    width: ${(props) => `${5.5 * props.theme.baseGutter}px`};
  }
  @media (max-width: 360px) {
    img {
      height: ${(props) => `${1.5 * props.theme.baseGutter}px`};
      width: ${(props) => `${1.5 * props.theme.baseGutter}px`};
    }
  }
`;

export const IconContainer = styled.span`
  @media (min-width: 1200px) {
    background-color: ${(props) => props.theme.menu.balanceBackgroundColor};
  }
  display: flex;
  align-items: center;
  height: 100%;
`;

export const BalanceContainer = styled.span`
  cursor: pointer;
  @media (min-width: 1200px) {
    border: 1px solid ${(props) => props.theme.menu.balanceBorderColor};
    &:hover {
      border: 1px solid
        ${(props) => props.theme.menu.balanceHoverBackgroundColor};
      ${IconContainer} {
        background-color: ${(props) =>
          props.theme.menu.balanceHoverBackgroundColor};
      }
    }
  }
  @media (max-width: 360px) {
    span {
      font-size: ${(props) => `${1.4 * props.theme.baseGutter}px`};
    }
    margin-right: ${(props) => `${1 * props.theme.baseGutter}px`} !important;
    margin-left: 0;
  }
  display: flex;
  align-items: center;
  height: ${(props) => `${4 * props.theme.baseGutter}px`};
  padding-left: ${(props) => `${props.theme.baseGutter}px`};
  border-radius: ${(props) => `${0.5 * props.theme.baseGutter}px`};
  margin-left: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  @media (max-width: 1200px) {
    margin-right: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  }
`;

export const UserIcon = styled.img`
  cursor: pointer;
  font-size: ${(props) => `${2 * props.theme.baseGutter}px`};
  margin: ${(props) => `${props.theme.baseGutter}px`};
  height: 20px;
  width: 20px;
`;

export const StyledPlusCircleFilledIcon = styled(PlusCircleFilled)`
  @media (max-width: 1200px) {
    color: ${(props) => props.theme.menu.balanceHoverBackgroundColor};
  }
  float: left;
  width: 20%;
  color: white;
  padding: ${(props) => props.theme.baseGutter}px;
`;

export const ResponsibleGamingContainer = styled.span`
  font-size: ${(props) => `${1.2 * props.theme.baseGutter}px`};
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  margin-left: ${(props) => `${1.5 * props.theme.baseGutter}px`};
  margin-right: ${(props) => `${4 * props.theme.baseGutter}px`};
  color: ${(props) => props.theme.menu.rgColor};
  font-size: ${(props) => `${1.2 * props.theme.baseGutter}px`};
  white-space: nowrap;
  cursor: pointer;
`;

export const ResponsibleGamingLogo = styled.img`
  width: ${(props) => `${3.2 * props.theme.baseGutter}px`};
  cursor: pointer;
`;
