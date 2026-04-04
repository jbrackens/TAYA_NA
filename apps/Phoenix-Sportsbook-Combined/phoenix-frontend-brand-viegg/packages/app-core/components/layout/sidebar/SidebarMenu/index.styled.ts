import styled from "styled-components";
import { Menu, Collapse, List } from "antd";

export const StyledMenu = styled(Menu)`
  height: 100vh;
  border-right: 0;
`;

export const StyledMenuItem = styled(Menu.Item)`
  padding-left: 10px !important;
  display: flex;
  align-items: center;
`;

type MenuItemTitleProps = {
  isCollapsed?: boolean;
  withoutIcon?: boolean;
};

export const MenuItemTitle = styled.span<MenuItemTitleProps>`
  margin-left: ${(props) => (!props.withoutIcon ? 0 : 8)}px;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-right: 2px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  align-self: center;
`;

export const MenuItemStarContainer = styled.span`
  margin-left: auto;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: all 150ms ease;
  color: var(--sb-text-secondary);
`;

export const SidebarContainer = styled.div`
  @media (max-width: 1200px) {
    padding-top: 0;
  }
  height: 100%;
  background: var(--sb-bg-surface);
  overflow-y: scroll;
  border-right: 1px solid var(--sb-border);
  padding-bottom: 16px;
`;

export const StyledBadge = styled.div`
  width: 25px;
  height: 25px;
  border-radius: 4px;
  background-color: rgba(26, 79, 160, 0.22);
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--sb-text-secondary);
  font-size: 11px;
  font-weight: 600;
`;

type StyledPanelProps = {
  selected: boolean;
};

export const StyledPanel = styled(Collapse.Panel)<StyledPanelProps>`
  font-weight: 500;
  font-size: ${(props) => 1.3 * props.theme.baseGutter}px;
  background-color: ${(props) =>
    props.selected ? "var(--sb-bg-elevated)" : "transparent"};
  border-bottom: 0 !important;
  border-left: ${(props) =>
    props.selected ? "2px solid var(--sb-accent-cyan)" : "2px solid transparent"};
  border-radius: 6px !important;
  margin: 0 8px 3px;
  transition: all 150ms ease;
  overflow: hidden;

  .ant-collapse-content-box {
    padding: 0 0 6px;
  }
  && > * {
    color: ${(props) =>
      props.selected ? "var(--sb-text-primary)" : "var(--sb-text-secondary)"} !important;
    border-top: none;
    min-height: 34px;
    align-items: center;
    background: transparent !important;
  }

  & > .ant-collapse-content {
    background-color: transparent !important;
  }

  &:hover {
    background-color: var(--sb-bg-elevated);
    && > * {
      color: var(--sb-text-primary) !important;
    }
    ${MenuItemStarContainer} {
      opacity: 1;
    }
  }
`;

type StyledListItemProps = {
  selected: boolean;
};

export const StyledListItem = styled(List.Item)<StyledListItemProps>`
  cursor: pointer;
  color: ${(props) =>
    props.selected ? "var(--sb-text-primary)" : "var(--sb-text-secondary)"} !important;
  background-color: ${(props) =>
    props.selected ? "var(--sb-bg-elevated)" : "transparent"};
  border-radius: 6px;
  min-height: 34px;
  padding: 0 12px !important;
  border-left: ${(props) =>
    props.selected ? "2px solid var(--sb-accent-cyan)" : "2px solid transparent"};
  transition: all 150ms ease;
  margin: 0 8px 3px;

  ${MenuItemTitle} {
    color: inherit;
    font-size: 12px;
    font-weight: 500;
  }

  ${MenuItemStarContainer} {
    opacity: 1;
  }

  &:hover {
    background-color: var(--sb-bg-elevated);
    color: var(--sb-text-primary) !important;
    && > * {
      color: var(--sb-text-primary) !important;
    }
    ${MenuItemStarContainer} {
      opacity: 1;
    }
  }
  border-bottom: none !important;
`;

type MenuContainerProps = {
  isCollapsed: boolean;
  isGamesListVisible: boolean;
};

export const MenuContainer = styled.div<MenuContainerProps>`
  text-align: center;
  & .ant-collapse {
    border: none;
    background: transparent;
    & .ant-collapse-item:last-child {
      @media (min-width: 1200px) {
        display: none;
      }
    }
  }
`;

export const GameMenuContainer = styled.div<MenuContainerProps>`
  text-align: center;
  & .ant-collapse {
    border: none;
    background: transparent;
    & .ant-collapse-item:last-child {
      @media (min-width: 1200px) {
        display: none;
      }
    }
  }
`;

export const LogoContainer = styled.div`
  @media (max-width: 1200px) {
    display: none;
  }
  min-height: ${(props) => 4.2 * props.theme.baseGutter}px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
  margin: 10px 10px 8px;
  padding: 2px 8px 6px;
  border-radius: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  & > div {
    margin-right: 0;
    cursor: pointer;
  }

  img {
    max-width: 54px;
    height: auto;
  }
`;

export const SidebarBrandEyebrow = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sb-text-tertiary);
  display: none;
`;

export const SidebarBrandTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--sb-text-primary);
`;

export const SidebarSectionLabel = styled.div`
  margin: 8px 16px 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sb-text-tertiary);
`;

export const MobileLinks = styled.div`
  @media (min-width: 1200px) {
    display: none;
  }
  display: table;
  width: 100%;
  height: 50px;
`;

type MobileLinkProps = {
  isSelected?: boolean;
};

export const MobileLink = styled.div<MobileLinkProps>`
  color: ${(props) =>
    props.isSelected ? "var(--sb-text-primary)" : "var(--sb-text-secondary)"};
  display: table-cell;
  text-align: center;
  cursor: pointer;
  border-bottom: ${(props) =>
    props.isSelected ? "2px solid var(--sb-accent-cyan)" : "2px solid transparent"};
  vertical-align: middle;
`;

export const SidebarSearchContainer = styled.div`
  margin: 8px 12px 12px;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SidebarSearchToggle = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--sb-border);
  background: var(--sb-bg-elevated);
  color: var(--sb-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-primary);
  }
`;

type SidebarSearchInputProps = {
  $isOpen: boolean;
};

export const SidebarSearchInput = styled.input<SidebarSearchInputProps>`
  width: ${(props) => (props.$isOpen ? "100%" : "0")};
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  pointer-events: ${(props) => (props.$isOpen ? "all" : "none")};
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--sb-border);
  background: var(--sb-bg-elevated);
  color: var(--sb-text-primary);
  padding: ${(props) => (props.$isOpen ? "0 12px" : "0")};
  transition: all 150ms ease;

  &:focus,
  &:focus-visible {
    border-color: var(--sb-accent-cyan);
    outline: none;
  }

  &::placeholder {
    color: var(--sb-text-tertiary);
  }
`;

export const SidebarSectionDivider = styled.div`
  height: 1px;
  background: var(--sb-border);
  margin: 8px 12px;
`;
