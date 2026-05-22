import React, { useMemo } from "react";
import type { ComponentType, ComponentProps } from "react";
import styled from "styled-components";
import { Row, Tabs } from "antd";
import type { TabsProps } from "antd";

const Tabs19 = Tabs as ComponentType<ComponentProps<typeof Tabs>>;
const Row19 = Row as ComponentType<ComponentProps<typeof Row>>;
import {
  buildTabsItemsFromChildren,
  type LegacyTabPaneProps,
} from "../../../components/layout/tabs/build-items";

// AntD v5 removed `Tabs.TabPane` (children API). User-details consumers
// (basic-details, financial-summary) still write
// `<TabsUserDetails><TabPane key tab>...</TabPane></TabsUserDetails>`.
// The wrapper preserves that JSX shape by translating children into the
// v5 `items` array via the shared `buildTabsItemsFromChildren` helper
// (marker-guard, Fragment flattening, missing-key warning, full prop
// forward, destroyInactiveTabPane → destroyOnHidden, memoized).

const StyledTabsUserDetails = styled(Tabs19)`
  .ant-tabs-nav {
    margin-bottom: 0;
  }
`;

export const TabPane: React.FC<LegacyTabPaneProps> = () => null;

type TabsUserDetailsProps = Omit<TabsProps, "items"> & {
  children?: React.ReactNode;
};

export const TabsUserDetails: React.FC<TabsUserDetailsProps> = ({
  children,
  ...rest
}) => {
  const items = useMemo(
    () => buildTabsItemsFromChildren(children, TabPane, "TabsUserDetails"),
    [children],
  );
  return <StyledTabsUserDetails items={items} {...rest} />;
};

export const DescriptionItemText = styled.span`
  margin-right: 5px;
`;

export const DescriptionItemLink = styled.a`
  margin-right: 10px;
  &.extra-left {
    margin-left: 10px;
  }
  svg {
    margin-right: 2px;
  }
`;

export const UserDetailsRow = styled(Row19)`
  .ant-tabs-content,
  .ant-card,
  .ant-tabs {
    height: 100%;
  }
`;
