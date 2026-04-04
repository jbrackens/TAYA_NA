import { Menu } from "antd";
import { useTranslation } from "next-export-i18n";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC, useEffect, useState, useMemo } from "react";
import { ContentComponent } from "./content";
import { useLogout } from "../../services/logout-services";
import {
  CollapseButton,
  LayoutHeader,
  LayoutSlider,
  LogoContainer,
  MainLayout,
  RightContent,
  MenuHeader,
  Hr,
} from "./index.styled";
import {
  HomeOutlined,
  SettingOutlined,
  LaptopOutlined,
  LockFilled,
  ProjectOutlined,
  SolutionOutlined,
  SearchOutlined,
  ProfileOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  WalletOutlined,
  UserOutlined,
} from "@ant-design/icons";

type LayoutProps = {};

export const LayoutComponent: FC<LayoutProps> = ({ children }) => {
  const { SubMenu } = Menu;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const [activeMenuItems, setActiveMenuItems] = useState<Array<string>>([]);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const onCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const { logOutAndRemoveToken, logOutWithoutApiCall } = useLogout();

  useEffect(() => {
    window.addEventListener("resize", windwoResized, true);
    return () => {
      window.removeEventListener("resize", windwoResized, true);
    };
  }, []);

  const windwoResized = () => {
    setScreenHeight(window.innerHeight);
  };

  useEffect(() => {
    const [, menuItemKey, submenuItemKey] = router.pathname.split("/");
    setActiveMenuItems([
      menuItemKey,
      ...(submenuItemKey ? [submenuItemKey] : []),
    ]);
  }, [router.pathname]);

  const logoutClicked = () => {
    // logOutAndRemoveToken();
    //** Using logout without api call until backend middleware is ready
    logOutWithoutApiCall();
    //**
  };

  const getInitialOpenKey = useMemo(() => {
    const routerDetails = router.pathname.split("/")[1];
    return [routerDetails];
  }, []);

  return (
    <MainLayout>
      <LayoutSlider
        collapsible
        collapsed={isCollapsed}
        onCollapse={onCollapse}
        width={295}
        trigger={null}
        collapsedWidth={76}
        $height={screenHeight}
      >
        <CollapseButton onClick={toggleCollapse} isCollapsed={isCollapsed}>
          <ArrowLeftOutlined />
        </CollapseButton>
        <Menu
          theme="dark"
          selectedKeys={activeMenuItems}
          defaultOpenKeys={getInitialOpenKey}
          mode="inline"
        >
          <LogoContainer
            isCollapsed={isCollapsed}
            onClick={() => router.push("/")}
          >
            {isCollapsed ? "S" : "Stella"}
          </LogoContainer>
          <Menu.Item key="" icon={<HomeOutlined size={20} />}>
            <Link href="/">
              <a>{t("HOME")}</a>
            </Link>
          </Menu.Item>
          <Menu.Item key="settings" icon={<SettingOutlined />}>
            <Link href="/settings">
              <a>{t("SETTINGS")}</a>
            </Link>
          </Menu.Item>
          <Menu.Item key="projects" icon={<LaptopOutlined />}>
            <Link href="/projects">
              <a>{t("PROJECTS")}</a>
            </Link>
          </Menu.Item>
          <SubMenu
            key="authentication"
            title={t("AUTHENTICATION")}
            icon={<LockFilled />}
          >
            <Menu.Item key="rsa-keys">
              <Link href="/authentication/rsa-keys">
                <a>{t("RSA_KEYS")}</a>
              </Link>
            </Menu.Item>
            <Menu.Item key="identity-providers">
              <Link href="/authentication/identity-providers">
                <a>{t("IDENTITY_PROVIDERS")}</a>
              </Link>
            </Menu.Item>
          </SubMenu>
          <SubMenu
            title={t("RULE_CONFIGURATION")}
            key="rule-configuration"
            icon={<ProjectOutlined />}
          >
            <Menu.Item key="events">
              <Link href="/rule-configuration/events">
                <a>{t("EVENTS")}</a>
              </Link>
            </Menu.Item>
            <Menu.Item key="aggregations">
              <Link href="/rule-configuration/aggregations">
                <a>{t("AGGREGATIONS")}</a>
              </Link>
            </Menu.Item>
            <Menu.Item key="achievements">
              <Link href="/rule-configuration/achievements">
                <a>{t("ACHIEVEMENTS")}</a>
              </Link>
            </Menu.Item>
          </SubMenu>
          <Menu.Item key="user-management" icon={<TeamOutlined />}>
            <Link href="/user-management">
              <a>{t("USER_MANAGEMENT")}</a>
            </Link>
          </Menu.Item>
          <Menu.Item key="players" icon={<SolutionOutlined />}>
            <Link href="/players">
              <a>{t("PLAYERS")}</a>
            </Link>
          </Menu.Item>
          <SubMenu key="wallet" title={t("WALLET")} icon={<WalletOutlined />}>
            <Menu.Item key="currencies">
              <Link href="/wallet/currencies">
                <a>{t("CURRENCIES")}</a>
              </Link>
            </Menu.Item>
          </SubMenu>
          <SubMenu
            key="oauth2"
            title={t("OAUTH2_CLIENTS")}
            icon={<UserOutlined />}
          >
            <Menu.Item key="clients">
              <Link href="/oauth2/clients">
                <a>{t("CLIENTS")}</a>
              </Link>
            </Menu.Item>
            <Menu.Item key="social">
              <Link href="/oauth2/social">
                <a>{t("SOCIAL")}</a>
              </Link>
            </Menu.Item>
          </SubMenu>
          <Hr />
          <Menu.Item key="data-explorer" icon={<SearchOutlined />}>
            <Link href="/data-explorer">
              <a>{t("DATA_EXPLORER")}</a>
            </Link>
          </Menu.Item>
          <Menu.Item key="documentation" icon={<ProfileOutlined />}>
            <Link href="/documentation">
              <a>{t("DOCUMENTATION")}</a>
            </Link>
          </Menu.Item>
          <Menu.Item key="9" icon={<LogoutOutlined />} onClick={logoutClicked}>
            {t("LOG_OUT")}
          </Menu.Item>
        </Menu>
      </LayoutSlider>
      <RightContent>
        <ContentComponent>{children}</ContentComponent>
        <LayoutHeader>
          <MenuHeader>
            <li>{t("ABOUT")}</li>
            <li>{t("PRESS")}</li>
            <li>{t("DEVELOPERS")}</li>
            <li>{t("PRIVACY")}</li>
          </MenuHeader>
        </LayoutHeader>
      </RightContent>
    </MainLayout>
  );
};
