import React, { useMemo } from "react";
import type { ComponentType, ComponentProps } from "react";
import { Tabs, Row } from "antd";
import type { TabsProps } from "antd";
import styled from "styled-components";
import {
  buildTabsItemsFromChildren,
  type LegacyTabPaneProps,
} from "./build-items";

const Tabs19 = Tabs as ComponentType<ComponentProps<typeof Tabs>>;
const Row19 = Row as ComponentType<ComponentProps<typeof Row>>;

const PADDING_SIZE = 48;

// AntD v5 removed `Tabs.TabPane` (children API). Consumers still write
// `<TabsSection><TabPaneStatic key tab>...</TabPaneStatic></TabsSection>`
// JSX. This wrapper preserves that shape by translating children into
// the v5 `items` array via the shared `buildTabsItemsFromChildren`
// helper (marker-guard, Fragment flattening, missing-key warning,
// full prop forward, destroyInactiveTabPane → destroyOnHidden rename,
// memoized item identity).

const StyledTabs = styled(Tabs19)`
  display: flex;
  flex-grow: 1;

  margin: ${PADDING_SIZE / 2}px ${-1 * PADDING_SIZE}px ${PADDING_SIZE / -2}px
    ${-1 * PADDING_SIZE}px;

  .ant-tabs-content-holder {
    display: flex;
    flex-grow: 1;
    width: auto;
    padding: ${PADDING_SIZE}px ${PADDING_SIZE}px;

    background: var(--surface-1, #ffffff);

    overflow-y: auto;
    overflow-x: hidden;
  }

  .ant-tabs-nav {
    margin-bottom: 0;
    padding: 0 ${PADDING_SIZE}px;
  }

  // Preserves the prior TabPaneStatic per-pane rule; v5 items API has no
  // per-pane styled wrapper, so target the pane class directly.
  .ant-tabs-tabpane {
    overflow: hidden;
  }
`;

// Marker component — renders null. The wrapper recognizes children whose
// `type` is this exact component and reads their props.
export const TabPaneStatic: React.FC<LegacyTabPaneProps> = () => null;

// Alias for v4-style consumers that did `const { TabPane } = Tabs;`.
// Import { TabPane } from this file instead — same v5 bridge.
export const TabPane = TabPaneStatic;

type TabsSectionProps = Omit<TabsProps, "items"> & {
  children?: React.ReactNode;
};

export const TabsSection: React.FC<TabsSectionProps> = ({
  children,
  ...rest
}) => {
  const items = useMemo(
    () => buildTabsItemsFromChildren(children, TabPaneStatic, "TabsSection"),
    [children],
  );
  return <StyledTabs items={items} {...rest} />;
};

export const TabSectionRow = styled(Row19)`
  flex-grow: 1;

  .ant-col {
    display: flex;
  }

  /* fixing issue with no table data on small resolution */
  .ant-table-body {
    max-height: none !important;
  }
`;
