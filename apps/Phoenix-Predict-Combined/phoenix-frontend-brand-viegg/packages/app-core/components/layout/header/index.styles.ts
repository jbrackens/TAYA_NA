import styled from "styled-components";
import { Layout, Menu as MenuComponent } from "antd";
import { PlusCircleFilled } from "@ant-design/icons";

const extractMenuTheme = (props: any) => props.theme.menu || {};

export const Header = styled(Layout.Header)`
  z-index: 999;
  height: 56px;
  @media (max-width: 1200px) {
    width: 100%;
    height: 56px;
  }
  width: calc(100% - 200px);
  display: flex;
  align-items: center;
  padding: 0 14px;
  @media (max-width: 1200px) {
    background-color: var(--sb-bg-surface) !important;
  }
  ${(props) =>
    extractMenuTheme(props).backgroundColor
      ? `
      background: var(--sb-bg-surface);
    `
      : "background: var(--sb-bg-surface); "}
  position: fixed;
  z-index: 20;
  border-bottom: 1px solid var(--sb-border);
  box-shadow: none;
  backdrop-filter: blur(10px);
`;

export const Menu = styled(MenuComponent)`
  flex-grow: 1;
  text-align: center;
  display: block;
  ${(props) =>
    props.theme.backgroundColor &&
    `
      background: ${props.theme.backgroundColor};
      border-bottom: 0;
      a {
        color: ${props.theme.inactiveAnchor} !important;
      }
      & .ant-menu-item {
        font-size: ${1.5 * props.theme.baseGutter}px;
        :hover {
          :after {
            border-color: ${props.theme.activeBorder} !important;
          }
        }
      }
      &>.ant-menu-item-active {
        color: ${props.theme.activeHover} !important;
        border-color: ${props.theme.activeBorder} !important;
        a {
          color: ${props.theme.activeHover} !important;
        }
      }
      &>.ant-menu-item-selected {
        color: ${props.theme.active} !important;
          :after {
            border-color: ${props.theme.activeBorder} !important;
          }
        a {
          color: ${props.theme.active} !important;
          font-weight: bold !important;
        }
      }
    `}
`;

export const MenuCollapseButton = styled.div`
  @media (max-width: 1200px) {
    display: block;
  }
  align-self: center;
  display: none;
  color: var(--sb-text-secondary);
  font-size: ${(props) => `${2 * props.theme.baseGutter}px`};
  margin-left: 0;
  margin-right: 1rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--sb-bg-elevated);
  border: 1px solid var(--sb-border);
  justify-content: center;
  align-items: center;
`;

export const LeftMenu = styled.div`
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.04em;
  @media (max-width: 1200px) {
    flex: 0;
    && > * {
      display: none;
    }
  }
`;

export const HeaderQuickNav = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

type HeaderQuickNavItemProps = {
  $active?: boolean;
};

export const HeaderQuickNavItem = styled.span<HeaderQuickNavItemProps>`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props.$active ? "var(--sb-accent-cyan)" : "transparent")};
  background: ${(props) =>
    props.$active ? "var(--sb-bg-elevated)" : "transparent"};
  color: ${(props) =>
    props.$active ? "var(--sb-text-primary)" : "var(--sb-text-secondary)"};
  font-size: 12px;
  font-weight: 600;
  transition: all 150ms ease;
  cursor: pointer;

  &:hover {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-primary);
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
  gap: 10px;
  @media (max-width: 1200px) {
    margin-right: 0;
    right: ${(props) => `${1.5 * props.theme.baseGutter}px`};
    flex: 0;
    gap: 8px;
  }
`;

export const BellAndBadgeContainer = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--sb-bg-elevated);
  border: 1px solid var(--sb-border);
  & .anticon {
    font-size: 16px;
    color: var(--sb-text-secondary);
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
  align-items: center;
`;

export const DropdownContainer = styled.div`
  @media (max-width: 1200px) {
    border-left: none;
  }
  height: auto;
  display: flex;
  align-items: center;
  width: auto;
  justify-content: center;
  @media (max-width: 1200px) {
    width: auto;
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
    background-color: transparent;
  }
  display: flex;
  align-items: center;
  height: 100%;
  margin-left: ${(props) => 0.6 * props.theme.baseGutter}px;
`;

export const BalanceContainer = styled.span`
  cursor: pointer;
  @media (min-width: 1200px) {
    border: 1px solid var(--sb-border);
    &:hover {
      border: 1px solid var(--sb-accent-cyan);
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
  height: 36px;
  padding: 0 8px 0 10px;
  border-radius: 8px;
  margin-left: 0;
  @media (max-width: 1200px) {
    margin-right: 0;
  }
  background: var(--sb-bg-elevated);
  color: var(--sb-text-primary);
  transition: all 150ms ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sb-accent-cyan);
    margin-right: ${(props) => 0.8 * props.theme.baseGutter}px;
  }
`;

export const UserIcon = styled.img`
  cursor: pointer;
  font-size: ${(props) => `${2 * props.theme.baseGutter}px`};
  margin: ${(props) => `${0.4 * props.theme.baseGutter}px`};
  height: 30px;
  width: 30px;
  background: var(--sb-bg-raised);
  border-radius: 50%;
  padding: 6px;
  border: 1px solid var(--sb-border);
  transition: all 150ms ease;

  &:hover {
    border-color: var(--sb-accent-cyan);
  }
`;

export const StyledPlusCircleFilledIcon = styled(PlusCircleFilled)`
  @media (max-width: 1200px) {
    color: var(--sb-accent-cyan);
  }
  float: left;
  width: auto;
  color: #000000;
  padding: 5px;
  background: var(--sb-accent-cyan);
  border-radius: 4px;
`;

export const ResponsibleGamingContainer = styled.span`
  font-size: 12px;
  font-weight: 500;
  margin-left: ${(props) => `${1 * props.theme.baseGutter}px`};
  margin-right: ${(props) => `${3 * props.theme.baseGutter}px`};
  color: var(--sb-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    color: var(--sb-text-secondary);
  }
`;

export const ResponsibleGamingLogo = styled.img`
  width: ${(props) => `${3.2 * props.theme.baseGutter}px`};
  cursor: pointer;
  opacity: 0.8;
`;
