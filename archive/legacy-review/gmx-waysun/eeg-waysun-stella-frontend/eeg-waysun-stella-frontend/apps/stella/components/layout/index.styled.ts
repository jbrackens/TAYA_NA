import styled from "styled-components";
import { Layout } from "antd";
import { ScrollbarStyle } from "ui";

export const MainLayout = styled<any>(Layout)`
  height: 100vh;
  overflow: hidden;
  flex-direction: row;
`;

export const LayoutHeader = styled(Layout.Header)`
  background-color: ${(props) => props.theme.header.background};
  width: 100%;
  display: flex;
  z-index: 2;
  border-top: 1px solid ${(props) => props.theme.layout.borderColor};
  height: fit-content;
`;

type SliderProps = {
  $height?: number;
};
export const LayoutSlider = styled(Layout.Sider)<SliderProps>`
  background-color: ${(props) => props.theme.mainSider.background};
  padding-right: 0;
  padding-left: ${(props) => (props.collapsed ? "12px" : "25px")};
  z-index: 2;
  .ant-layout-sider-children {
    ${ScrollbarStyle}
    padding-right: ${(props) => (props.collapsed ? "15px" : "35px")};
    .ant-menu-root {
      background-color: ${(props) => props.theme.mainSider.background};
      display: flex;
      flex-flow: column;
      min-height: ${(props) => props.$height}px;

      .anticon {
        font-size: 20px;
      }

      .ant-menu-item {
        height: ${(props) => (props.collapsed ? "52px" : "auto")};
        width: ${(props) => (props.collapsed ? "52px" : "auto")};
      }

      > li:last-child {
        margin-top: auto;
        margin-bottom: 50px;
      }

      .ant-menu-item-selected {
        border-radius: 10px;
        background-image: ${(props) => props.theme.mainSider.selected};
        background-color: transparent;
      }

      .ant-menu-submenu-selected {
        .ant-menu-submenu-title {
          background-image: ${(props) => props.theme.mainSider.selected};
          border-radius: 10px;
        }
      }

      .ant-menu-sub {
        background-color: ${(props) => props.theme.mainSider.background};
        .ant-menu-item-selected {
          background-image: none;
          a {
            color: ${(props) => props.theme.mainSider.submenu.font};
          }
        }
      }
    }
  }

  &.ant-layout-sider-collapsed {
    .ant-menu-item {
      .anticon {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
      }
    }
  }
`;

type LogoContainerProps = {
  isCollapsed: boolean;
};

export const LogoContainer = styled.li<LogoContainerProps>`
  color: white;
  font-size: 45px;
  height: 50px;
  margin-top: 78px;
  margin-left: ${(props) => (props.isCollapsed ? "12px" : "20px")};
  cursor: pointer;
`;

type CollapseButtonProps = {
  isCollapsed: boolean;
};

export const CollapseButton = styled.div<CollapseButtonProps>`
  height: 37px;
  width: 37px;
  background-color: ${(props) =>
    props.theme.mainSider.collapseButton.background};
  border-radius: 10px;
  position: absolute;
  right: -20px;
  top: 65px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: ${(props) => props.theme.mainSider.collapseButton.icon};
  font-size: 10px;
  .anticon {
    transform: ${(props) =>
      props.isCollapsed ? "rotate(180deg)" : "rotate(0deg)"};
  }
`;

export const MenuHeader = styled.ul`
  margin: 0;
  margin-left: auto;
  list-style-type: none;
  padding: 0;
  overflow: hidden;
  li {
    display: block;
    text-align: center;
    text-decoration: none;
    color: ${(props) => props.theme.header.font};
    float: left;
    margin-left: 32px;
    cursor: pointer;
    line-height: 40px;
    &:hover {
      color: ${(props) => props.theme.header.fontSelected};
    }
  }
`;

export const ListSider = styled(Layout.Sider)`
  background: ${(props) => props.theme.content.background};
  height: 100%;
`;

export const RightContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const Hr = styled.div`
  width: 100%;
  margin: 20px 0;
  border-top: 1px solid ${(props) => props.theme.layout.borderColor};
`;
