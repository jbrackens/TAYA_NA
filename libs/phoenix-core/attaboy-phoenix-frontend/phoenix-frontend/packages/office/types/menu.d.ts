import { ReactNode } from "react";
import { Omit } from "utility-types";
import { UserOutlined } from "@ant-design/icons/";
import { PunterRoles } from "@phoenix-ui/utils";

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
