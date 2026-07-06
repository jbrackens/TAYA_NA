import React, { useMemo } from "react";
import { Tabs, Row } from "antd";
import type { TabsProps } from "antd";
import {
  buildTabsItemsFromChildren,
  type LegacyTabPaneProps,
} from "./build-items";

// AntD v5 removed `Tabs.TabPane` (children API). Consumers still write
// `<TabsSection><TabPaneStatic key tab>...</TabPaneStatic></TabsSection>`
// JSX. This wrapper preserves that shape by translating children into
// the v5 `items` array via the shared `buildTabsItemsFromChildren`
// helper (marker-guard, Fragment flattening, missing-key warning,
// full prop forward, destroyInactiveTabPane → destroyOnHidden rename,
// memoized item identity).

const TABS_SECTION_CLASS_NAME = [
  "mt-6 -mx-12 -mb-6 flex grow",
  "[&_.ant-tabs-content-holder]:flex",
  "[&_.ant-tabs-content-holder]:grow",
  "[&_.ant-tabs-content-holder]:w-auto",
  "[&_.ant-tabs-content-holder]:overflow-y-auto",
  "[&_.ant-tabs-content-holder]:overflow-x-hidden",
  "[&_.ant-tabs-content-holder]:bg-[var(--surface-1)]",
  "[&_.ant-tabs-content-holder]:p-12",
  "[&_.ant-tabs-nav]:mb-0",
  "[&_.ant-tabs-nav]:px-12",
  "[&_.ant-tabs-tabpane]:overflow-hidden",
].join(" ");

const TAB_SECTION_ROW_CLASS_NAME = [
  "grow",
  "[&_.ant-col]:flex",
  "[&_.ant-table-body]:!max-h-none",
].join(" ");

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
  className,
  ...rest
}) => {
  const items = useMemo(
    () => buildTabsItemsFromChildren(children, TabPaneStatic, "TabsSection"),
    [children],
  );
  return (
    <Tabs
      items={items}
      className={[TABS_SECTION_CLASS_NAME, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
};

type TabSectionRowProps = React.ComponentProps<typeof Row>;

export const TabSectionRow: React.FC<TabSectionRowProps> = ({
  className,
  ...props
}) => (
  <Row
    className={[TAB_SECTION_ROW_CLASS_NAME, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);
