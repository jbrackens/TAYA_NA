import React, { useState, useEffect } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { MenuItem, MenuItemGrouped } from "../../../../types/menu";
import {
  resolveToken,
  validateAndCheckEligibility,
} from "../../../../utils/auth";
import { useTranslation } from "i18n";
import { find, isEmpty } from "lodash";
import {
  groupItems,
  isActive,
} from "../../../../providers/menu/utils/resolvers";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSpy, SpyCallbackProps } from "@phoenix-ui/utils";

type SidebarMenuProps = {
  menu?: MenuItem[];
  onVisibilityChange: Function;
};

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menu,
  onVisibilityChange,
}) => {
  const router = useRouter();
  // Defer token-dependent rendering to client to avoid SSR hydration mismatch
  // (localStorage is unavailable during SSR, producing different menu items)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const token = mounted ? resolveToken() : null;
  const { spy } = useSpy();

  const { t } = useTranslation("sidebar");

  const filteredMenuItems = menu?.filter((item: MenuItem) =>
    validateAndCheckEligibility(token ?? "", item.roles),
  );

  const activeItem = find(filteredMenuItems, (item: MenuItem) =>
    isActive(item, router.pathname),
  );
  const activeGroupItem = find(
    activeItem?.children?.map((item: MenuItem) => ({
      ...item,
      absolutePath: `${activeItem?.path}${item.path}`,
    })),
    (item: MenuItem) => isActive(item, router.pathname),
  );
  const groups = groupItems(activeItem?.children || [], activeItem?.path);

  const checkIfSidebarShouldBeVisible = ({ values }: SpyCallbackProps) => {
    onVisibilityChange(!isEmpty(values?.children));
  };

  spy(activeItem, checkIfSidebarShouldBeVisible);

  // AntD v5 removed Menu's children/<Menu.Item>/<SubMenu> JSX API; built as
  // an `items` array. Each group becomes a submenu item; an item with
  // `children` is rendered as a submenu by default.
  const items: MenuProps["items"] = groups.map((groupItem: MenuItemGrouped) => {
    const { icon: Icon }: any = groupItem;
    return {
      key: groupItem.key,
      icon: <Icon />,
      label: t(groupItem.label),
      children: groupItem.children.map(
        ({ key, label, path, absolutePath }: MenuItem) => ({
          key,
          label: <Link href={absolutePath || path}>{t(label)}</Link>,
        }),
      ),
    };
  });

  return (
    <Menu
      mode="inline"
      defaultSelectedKeys={[activeGroupItem?.key as string]}
      defaultOpenKeys={[activeGroupItem?.group as string]}
      className="h-screen border-r-0 pt-16"
      items={items}
    />
  );
};
export { SidebarMenu };
