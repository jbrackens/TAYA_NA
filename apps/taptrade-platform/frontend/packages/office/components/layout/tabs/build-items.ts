import React from "react";
import type { TabsProps } from "antd";

// Bridge utility for AntD v5 Tabs migration. v5 removed `Tabs.TabPane`
// (children API). Office consumers still write
// `<TabsX><TabPane key="x" tab="L">...</TabPane>...</TabsX>` JSX. The bridge
// walks children, recognizes a caller-supplied marker component, flattens
// React fragments, validates keys (dev-mode), and returns a v5 `items`
// array — preserving all legacy TabPane props the bridge is aware of plus
// renaming `destroyInactiveTabPane` (v4 Tabs-level prop) to v5's per-pane
// `destroyOnHidden`. Used by both `components/layout/tabs/index.styled.tsx`
// and `containers/users/details/index.styled.tsx`.

export type LegacyTabPaneProps = {
  // v4 TabPane label slot.
  tab?: React.ReactNode;
  // v5 prefers `label`; accept both so consumers can incrementally migrate.
  label?: React.ReactNode;
  // Per-pane lifecycle/UX.
  disabled?: boolean;
  closable?: boolean;
  closeIcon?: React.ReactNode;
  forceRender?: boolean;
  // v4 spelling (Tabs-level prop, sometimes drilled per-pane in older code).
  destroyInactiveTabPane?: boolean;
  // v5 spelling.
  destroyOnHidden?: boolean;
  // Pane icon.
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

type TabItem = NonNullable<TabsProps["items"]>[number];

const keyWarnedFor = new Set<string>();

function warnMissingKey(componentName: string, sourceHint?: string) {
  if (process.env.NODE_ENV === "production") return;
  const id = `${componentName}:${sourceHint || "anonymous"}`;
  if (keyWarnedFor.has(id)) return;
  keyWarnedFor.add(id);
  // eslint-disable-next-line no-console
  console.warn(
    `[antd-v5 tabs bridge] <${componentName}> child is missing a \`key\` prop. ` +
      `v5 Tabs items require stable keys; falling back to "" causes panes to ` +
      `collapse and lose controlled-state. Source hint: ${sourceHint || "(unknown)"}`,
  );
}

function flattenChildren(node: React.ReactNode): React.ReactNode[] {
  // Flatten Fragments + arrays so `<>...</>` and `[...mapped]` nest correctly
  // inside <TabsSection>...</TabsSection> without dropping panes.
  const out: React.ReactNode[] = [];
  React.Children.forEach(node, (child) => {
    if (child === null || child === undefined || child === false) return;
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const fragmentChildren = (child.props as { children?: React.ReactNode })
        .children;
      out.push(...flattenChildren(fragmentChildren));
      return;
    }
    out.push(child);
  });
  return out;
}

export function buildTabsItemsFromChildren(
  children: React.ReactNode,
  marker: React.ComponentType<LegacyTabPaneProps>,
  componentName: string,
): TabItem[] {
  const items: TabItem[] = [];
  for (const child of flattenChildren(children)) {
    if (!React.isValidElement(child)) continue;
    // Marker-type guard: only count children whose type IS the bridge marker.
    // Other valid elements (a stray <div>, conditionally-rendered other
    // component) are silently ignored to avoid building bogus blank tabs.
    if (child.type !== marker) continue;
    const props = child.props as LegacyTabPaneProps;
    const key = child.key != null ? String(child.key) : "";
    if (key === "") {
      warnMissingKey(
        componentName,
        typeof props.tab === "string"
          ? props.tab
          : typeof props.label === "string"
            ? props.label
            : undefined,
      );
    }
    items.push({
      key,
      label: props.label ?? props.tab,
      disabled: props.disabled,
      closable: props.closable,
      closeIcon: props.closeIcon,
      forceRender: props.forceRender,
      // v5 renamed v4's `destroyInactiveTabPane` to per-pane `destroyOnHidden`.
      destroyOnHidden:
        props.destroyOnHidden ?? props.destroyInactiveTabPane,
      icon: props.icon,
      children: props.children,
    });
  }
  return items;
}
