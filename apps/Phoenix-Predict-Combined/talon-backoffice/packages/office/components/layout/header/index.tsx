import React, { useContext, useState, useEffect } from "react";
import { useTranslation } from "i18n";
import { PoweroffOutlined, UserOutlined } from "@ant-design/icons";
import { get, find } from "lodash";
import { ThemeContext } from "styled-components";
import { Header, Menu, LeftMenu } from "./index.styles";
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
    validateAndCheckEligibility(token, item.roles),
  );

  const dropdownMenu = (
    <Menu>
      <Menu.Item key="settings">
        <Link href="/account/settings">
          {t("SETTINGS")}
        </Link>
      </Menu.Item>
      <Menu.Item key="security">
        <Link href="/account/security">
          {t("SECURITY")}
        </Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="signup" onClick={handleSignOut}>
        <PoweroffOutlined /> {t("SIGN_OUT_LINK")}
      </Menu.Item>
    </Menu>
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
      >
        {filteredMenuItems?.map(
          ({ key, label, path, absolutePath }: MenuItem) => (
            <Menu.Item key={key}>
              <Link href={absolutePath || path}>
                {t(label)}
              </Link>
            </Menu.Item>
          ),
        )}
      </LeftMenu>
      <Profile theme={theme} />
      <Dropdown overlay={dropdownMenu} trigger={["click"]}>
        <Avatar size={40} icon={<UserOutlined />} />
      </Dropdown>
    </Header>
  );
};

export default HeaderComponent;
