import { Layout } from "antd";
import type { LayoutProps } from "antd";
import type { ComponentType, ComponentProps } from "react";
import styled from "styled-components";

const { Content } = Layout;

// React 19 components return ReactNode, but styled-components v5's styled()
// overloads still expect FunctionComponent (ReactElement | null). Cast antd
// components to ComponentType so styled() accepts them; props are preserved.
const Content19 = Content as ComponentType<ComponentProps<typeof Content>>;
const Layout19 = Layout as ComponentType<ComponentProps<typeof Layout>>;

type LayoutContentProps = LayoutProps & {
  $hasSidebar?: boolean;
};

export const LayoutContent = styled(Content19)<LayoutContentProps>`
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

export const LayoutWrapper = styled(Layout19)<LayoutWrapperProps>`
  height: ${(props) => (props.$fullscreen ? "100%" : "unset")};
  padding: ${(props) => (props.$hasSidebar ? "64px 24px 24px 224px" : 0)};
`;
