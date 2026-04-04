import { Layout } from "antd";
import { LayoutProps } from "antd/lib/layout";
import styled from "styled-components";

const { Content } = Layout;

type LayoutContentProps = LayoutProps & {
  $hasSidebar?: boolean;
};

export const LayoutContent = styled(Content)<LayoutContentProps>`
  display: flex;
  flex-direction: column;
  padding: ${(props) => (props.$hasSidebar ? "24px" : "88px 48px 24px 48px")};
  margin: 0;
  min-height: 100vh;
`;

type LayoutWrapperProps = LayoutProps & {
  $fullscreen?: boolean;
  $hasSidebar?: boolean;
};

export const LayoutWrapper = styled(Layout)<LayoutWrapperProps>`
  height: ${(props) => (props.$fullscreen ? "100%" : "unset")};
  padding: ${(props) => (props.$hasSidebar ? "64px 24px 24px 224px" : 0)};
`;
