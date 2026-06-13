import styled from "styled-components";
import { Layout } from "antd";

type LayoutWrapperProps = {
  $haspadding?: boolean;
};

export const LayoutWrapper = styled(Layout)<LayoutWrapperProps>`
  @media (max-width: 1200px) {
    padding: ${(props) => (props.$haspadding ? "64px 0 0 0" : "")};
  }

  .ant-layout-content {
    @media (max-width: 1200px) {
      margin-bottom: ${(props) => (props.$haspadding ? "10px !important" : "")};
    }
  }
  padding: ${(props) => (props.$haspadding ? "64px 24px 24px 0px" : "")};
  height: 100vh;
`;

export const CustomSider = styled(Layout.Sider)`
  background-color: ${(props) =>
    props.theme.sidebar.backgroundColor} !important;
  @media (max-width: 1200px) {
    display: none !important;
  }
`;

export const BetslipContainer = styled(Layout.Sider)`
  background: ${(props) =>
    props.theme.betslip.backgroundColor
      ? props.theme.betslip.backgroundColor
      : "white"};
  @media (max-width: 1200px) {
    display: none !important;
  }
  .ant-layout-sider-children {
    position: fixed;
  }
`;

type LayoutProps = {
  main?: any;
};

export const StyledLayout = styled(Layout)<LayoutProps>`
  background-color: ${(props) => props.theme.content.backgroundColor};
  overflow: hidden;
  @media (min-width: 1200px) {
    min-height: ${(props) => (props.main ? "" : "100%")};
  }
`;
