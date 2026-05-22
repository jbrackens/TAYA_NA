import React, { useContext, useState, useEffect } from "react";
import { useTranslation } from "i18n";
import { PoweroffOutlined, UserOutlined } from "@ant-design/icons";
import { get, find } from "lodash";
import { ThemeContext } from "styled-components";
import type { MenuProps } from "antd";
import { Header, LeftMenu } from "./index.styles";
import { Logo } from "./logo";
import { MenuItem } from "../../../types/menu";
import {
  resolveToken,
  validateAndCheckEligibility,
  clientNukeAuth,
} from "../../../utils/auth";
import { useRouter } from "next/router";
import { isActive } from "../../../providers/menu/utils/resolvers";
import Profile from "./profile";
import { Avatar, Dropdown } from "antd";
import Link from "next/link";

type HeaderComponentProps = {
  home?: Boolean | undefined;
  menu?: MenuItem[];
};

const HeaderComponent: React.FC<HeaderComponentProps> = ({ menu }) => {
  const theme = useContext(ThemeContext);
  const router = useRouter();
  // Defer token resolution to client to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const token = mounted ? resolveToken() : null;

  const { t } = useTranslation(["header"]);

  const handleSignOut = () => clientNukeAuth(false);

  const filteredMenuItems = menu?.filter((item: MenuItem) =>
    validateAndCheckEligibility(token ?? "", item.roles),
  );

  // AntD v5 removed Menu's children/<Menu.Item> JSX API. Both menus on this
  // header are now `items` arrays — required for the LeftMenu (horizontal
  // nav) and for the user Dropdown (which also lost the `overlay` prop in
  // v5, replaced by `menu={{items}}`).
  const dropdownItems: MenuProps["items"] = [
    {
      key: "settings",
      label: <Link href="/account/settings">{t("SETTINGS")}</Link>,
    },
    {
      key: "security",
      label: <Link href="/account/security">{t("SECURITY")}</Link>,
    },
    { type: "divider" },
    {
      key: "signout",
      label: (
        <span>
          <PoweroffOutlined /> {t("SIGN_OUT_LINK")}
        </span>
      ),
      onClick: handleSignOut,
    },
  ];

  const leftMenuItems: MenuProps["items"] = (filteredMenuItems || []).map(
    ({ key, label, path, absolutePath }: MenuItem) => ({
      key,
      label: <Link href={absolutePath || path}>{t(label)}</Link>,
    }),
  );

  return (
    <Header>
      <Logo theme={theme.logo} />
      <LeftMenu
        theme={theme.menu}
        mode="horizontal"
        selectedKeys={[
          get(
            find(filteredMenuItems, (item: MenuItem) =>
              isActive(item, router.pathname),
            ),
            "key",
            "",
          ),
        ]}
        items={leftMenuItems}
      />
      <Profile theme={theme} />
      <Dropdown menu={{ items: dropdownItems }} trigger={["click"]}>
        <Avatar size={40} icon={<UserOutlined />} />
      </Dropdown>
    </Header>
  );
};

export default HeaderComponent;
