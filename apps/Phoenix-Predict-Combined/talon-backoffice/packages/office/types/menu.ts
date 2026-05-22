import { Omit } from "utility-types";
import { PunterRoles } from "@phoenix-ui/utils";

// antd icon component type (e.g. DashboardOutlined), used for menu group icons.
type AntdIcon = (typeof import("@ant-design/icons"))["DashboardOutlined"];

export type MenuItem = {
  key: string;
  group?: MenuItemGroup;
  path: string;
  absolutePath?: string;
  label: string;
  roles?: PunterRoles;
  children?: MenuItem[];
};

export type MenuItemGrouped = {
  key: MenuItemGroup;
  label: string;
  icon?: MenuItemGroupedIcons;
  children: Omit<MenuItem, "children">[];
};

export type MenuItemGroupedIcons = {
  [MenuItemGroupEnum.DASHBOARD]: AntdIcon;
  [MenuItemGroupEnum.TRADING]: AntdIcon;
};

export type HeaderMenuItemProps = MenuItem;

export enum MenuItemGroupEnum {
  TRADING = "trading",
  DASHBOARD = "dashboard",
}

export type MenuItemGroup =
  | MenuItemGroupEnum.TRADING
  | MenuItemGroupEnum.DASHBOARD;
