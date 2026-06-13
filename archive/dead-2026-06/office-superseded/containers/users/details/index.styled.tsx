import React, { useMemo } from "react";
import type { ComponentType, ComponentProps } from "react";
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

const classNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export const TabPane: React.FC<LegacyTabPaneProps> = () => null;

type TabsUserDetailsProps = Omit<TabsProps, "items"> & {
  children?: React.ReactNode;
};

export const TabsUserDetails: React.FC<TabsUserDetailsProps> = ({
  children,
  className,
  ...rest
}) => {
  const items = useMemo(
    () => buildTabsItemsFromChildren(children, TabPane, "TabsUserDetails"),
    [children],
  );
  return (
    <Tabs19
      items={items}
      className={classNames("[&_.ant-tabs-nav]:!mb-0", className)}
      {...rest}
    />
  );
};

export function DescriptionItemText({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={classNames("mr-[5px]", className)} />;
}

export function DescriptionItemLink({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      className={classNames(
        "mr-2.5 [&.extra-left]:ml-2.5 [&_svg]:mr-0.5",
        className,
      )}
    />
  );
}

export function UserDetailsRow({
  className,
  ...props
}: ComponentProps<typeof Row>) {
  return (
    <Row19
      {...props}
      className={classNames(
        "[&_.ant-card]:h-full [&_.ant-tabs-content]:h-full [&_.ant-tabs]:h-full",
        className,
      )}
    />
  );
}
