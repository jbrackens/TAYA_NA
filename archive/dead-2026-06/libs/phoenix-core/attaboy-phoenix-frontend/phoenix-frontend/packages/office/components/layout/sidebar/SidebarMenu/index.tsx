import React from "react";
import { Menu } from "antd";
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
const { SubMenu } = Menu;

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  menu,
  onVisibilityChange,
}) => {
  const router = useRouter();
  const token = resolveToken();
  const { spy } = useSpy();

  const { t } = useTranslation("sidebar");

  const filteredMenuItems = menu?.filter((item: MenuItem) =>
    validateAndCheckEligibility(token, item.roles),
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

  return (
    <Menu
      mode="inline"
      defaultSelectedKeys={[activeGroupItem?.key as string]}
      defaultOpenKeys={[activeGroupItem?.group as string]}
      style={{ paddingTop: 64, height: "100vh", borderRight: 0 }}
    >
      {groups.map((groupItem: MenuItemGrouped) => {
        const { icon: Icon }: any = groupItem;
        return (
          <SubMenu
            key={groupItem.key}
            icon={<Icon />}
            title={t(groupItem.label)}
          >
            {groupItem.children.map(
              ({ key, label, path, absolutePath }: MenuItem) => (
                <Menu.Item key={key}>
                  <Link href={absolutePath || path}>
                    <a>{t(label)}</a>
                  </Link>
                </Menu.Item>
              ),
            )}
          </SubMenu>
        );
      })}
    </Menu>
  );
};
export { SidebarMenu };
