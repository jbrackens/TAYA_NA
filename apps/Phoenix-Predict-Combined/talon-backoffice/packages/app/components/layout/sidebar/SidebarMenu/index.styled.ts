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
  margin-left: ${(props) => (!props.withoutIcon ? 0 : 10)}px;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-right: 2px;
  font-size: ${(props) => (!props.withoutIcon ? 12 : 14)}px;
  align-self: center;
`;

export const MenuItemStarContainer = styled.span`
  margin-left: auto;
`;

export const SidebarContainer = styled.div`
  @media (max-width: 1200px) {
    padding-top: 0;
  }
  height: 100%;
  background: ${(props) => props.theme.sidebar.backgroundColor};
  overflow-y: scroll;
  ::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }
`;

export const StyledBadge = styled.div`
  width: 25px;
  height: 25px;
  border-radius: 5px;
  background-color: ${(props) => props.theme.sidebar.badgeColor};
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${(props) => props.theme.sidebar.badgeFontColor};
`;

type StyledPanelProps = {
  selected: boolean;
};

export const StyledPanel = styled(Collapse.Panel)<StyledPanelProps>`
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  font-size: ${(props) => 1.4 * props.theme.baseGutter}px;
  background-color: ${(props) => props.theme.sidebar.backgroundColor};
  border-bottom: 1px solid ${(props) => props.theme.sidebar.borderColor} !important;
  background-image: ${(props) =>
    props.selected && props.theme.sidebar.selectedCollapsedMenuShadow};
  border-radius: 0 !important;
  .ant-collapse-content-box {
    padding: 0;
  }
  && > * {
    color: ${(props) =>
      props.selected
        ? props.theme.sidebar.activeGameColor
        : props.theme.sidebar.inactiveGameColor} !important;
    border-top: none;
  }

  & > .ant-collapse-content {
    background-color: ${(props) =>
      props.theme.sidebar.collapsedMenuColor} !important;
  }

  &:hover {
    background-image: ${(props) =>
      props.theme.sidebar.selectedCollapsedMenuShadow};
    && > * {
      color: ${(props) => props.theme.sidebar.menuItemHoverColor} !important;
    }
  }
`;

type StyledListItemProps = {
  selected: boolean;
};

export const StyledListItem = styled(List.Item)<StyledListItemProps>`
  cursor: pointer;
  color: ${(props) =>
    props.selected
      ? props.theme.sidebar.selectedCollapsedMenuItemColor
      : props.theme.sidebar.inactiveGameColor} !important;
  background-image: ${(props) =>
    props.selected && props.theme.sidebar.selectedCollapsedMenuItemShadow};
  &:hover {
    background-image: ${(props) =>
      props.theme.sidebar.selectedCollapsedMenuItemShadow};
    && > * {
      color: ${(props) =>
        props.theme.sidebar.collapsedMenuItemHoverColor} !important;
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
  height: ${(props) => 8 * props.theme.baseGutter}px;
  display: flex;
  justify-content: center;
  align-items: center;
  & > div {
    margin-right: 0;
    cursor: pointer;
  }
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
  color: ${(props) => props.theme.sidebar.inactiveGameColor};
  display: table-cell;
  text-align: center;
  cursor: pointer;
  border-bottom: ${(props) =>
    props.isSelected &&
    `2px solid ${props.theme.sidebar.selectedCollapsedMenuItemColor}`};
  vertical-align: middle;
`;
