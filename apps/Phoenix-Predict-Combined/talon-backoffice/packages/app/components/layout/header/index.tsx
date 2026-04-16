import React, { useContext, useState, useEffect } from "react";
import { useTranslation } from "i18n";
// import { get, find } from "lodash";
import Link from "next/link";
import { ThemeContext } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { LanguageSelectorComponent } from "./language-selector";
// import MenuContext from "../../../providers/menu";
import {
  Header,
  // Menu,
  MenuCollapseButton,
  RightMenu,
  LeftMenu,
  BellAndBadgeContainer,
  LogoContainer,
  HideOnMobileContainer,
  DropdownContainer,
  BalanceContainer,
  IconContainer,
  StyledPlusCircleFilledIcon,
  UserIcon,
  ResponsibleGamingContainer,
  ResponsibleGamingLogo,
} from "./index.styles";
import { Logo } from "./logo";
import { Menu as AntdMenu, Dropdown, Badge } from "antd";
import { BellFilled } from "@ant-design/icons";
import { CurrentBalanceComponent } from "../../current-balance";
import { showCashierDrawer } from "../../../lib/slices/cashierSlice";
import { useLogout } from "../../../hooks/useLogout";
// import { SignupButtonComponent } from "./buttons/signup-button";
import { LoginButtonComponent } from "./buttons/login-button";
import { LinkWrapper } from "../../linkWrapper";
// import { isMenuItemActive, MenuItem } from "@phoenix-ui/utils";

const {
  SHOW_FOR_SUBMISSION,
} = require("next/config").default().publicRuntimeConfig;

type HeaderComponentProps = {
  home?: Boolean | undefined;
  setIsGamesListVisible: (isVisible: boolean) => void;
  layoutWidth: number;
};

const HeaderComponent: React.FC<HeaderComponentProps> = ({
  setIsGamesListVisible,
  layoutWidth,
}) => {
  // const menuItems = ([] = useContext(MenuContext));
  const theme = useContext(ThemeContext);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { logOutAndRemoveToken } = useLogout();

  const { t } = useTranslation(["header", "sidebar", "responsible-gaming"]);

  const dispatch = useDispatch();

  const onLogoutClick = () => {
    logOutAndRemoveToken();
  };

  const menu = (
    <AntdMenu>
      <AntdMenu.Item key="1">
        <Link href="/account">
          {t("ACCOUNT")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="2">
        <Link href="/account/notifications">
          {t("sidebar:NOTIFICATIONS")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="3">
        <Link href="/account/settings">
          {t("sidebar:SETTINGS")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="4">
        <Link href="/account/responsible-gaming">
          {t("sidebar:LIMITS")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="5">
        <Link href="/account/security">
          {t("sidebar:SECURITY")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="6">
        <Link href="/account/transactions">
          {t("sidebar:TRANSACTIONS")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="7">
        <Link href="/account/bet-history">
          {t("sidebar:BET_HISTORY")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="8">
        <Link href="/account/rg-history">
          {t("sidebar:RG_HISTORY")}
        </Link>
      </AntdMenu.Item>
      <AntdMenu.Item key="9" onClick={() => onLogoutClick()}>
        {t("LOGOUT_LINK")}
      </AntdMenu.Item>
    </AntdMenu>
  );

  const dispatchShowCashierDrawer = () => {
    dispatch(showCashierDrawer());
  };

  const userIcon =
    layoutWidth > 1200 ? theme.menu.userIcon : theme.menu.mobileUserIcon;
  const userHoverIcon = theme.menu.userIconHover;
  const [userIconSrc, setUserIconSrc] = useState(userIcon);

  useEffect(() => {
    if (layoutWidth > 1200) {
      setUserIconSrc(theme.menu.userIcon);
      return;
    }
    setUserIconSrc(theme.menu.mobileUserIcon);
  }, [layoutWidth]);

  return (
    <>
      <Header>
        <MenuCollapseButton onClick={() => setIsGamesListVisible(true)}>
          <img src="/images/menu.svg" />
        </MenuCollapseButton>
        <LinkWrapper href={"/"}>
          <LogoContainer>
            <Logo theme={theme.mobileLogo} />
          </LogoContainer>
        </LinkWrapper>
        <LeftMenu>
          {/* <Menu
            theme={{ ...theme.menu, baseGutter: theme.baseGutter }}
            mode="horizontal"
            selectedKeys={[
              get(
                find(
                  menuItems,
                  (item: MenuItem) =>
                    menuItems && isMenuItemActive(item, router.pathname),
                ),
                "key",
                "",
              ),
            ]}
          >
            {menuItems.map((item) => (
              <Menu.Item key={item.key}>
                <Link href={item.href}>
                  <a>{t(item.label)}</a>
                </Link>
              </Menu.Item>
            ))}
          </Menu> */}
        </LeftMenu>
        <RightMenu>
          <HideOnMobileContainer>
            <LinkWrapper href="/responsible-gaming">
              <span>
                <ResponsibleGamingLogo
                  src={theme.menu.rgLogo}
                  style={{ width: "32px" }}
                />
              </span>
            </LinkWrapper>
            <LinkWrapper href="/responsible-gaming">
              <ResponsibleGamingContainer>
                {t("RESPONSIBLE_GAMING")}
              </ResponsibleGamingContainer>
            </LinkWrapper>
            {Number(SHOW_FOR_SUBMISSION) ? (
              <LanguageSelectorComponent />
            ) : (
              <></>
            )}
          </HideOnMobileContainer>
          {isLoggedIn ? (
            <>
              {Number(SHOW_FOR_SUBMISSION) ? (
                <HideOnMobileContainer>
                  <BellAndBadgeContainer>
                    <Badge dot={true}>
                      <BellFilled />
                    </Badge>
                  </BellAndBadgeContainer>
                </HideOnMobileContainer>
              ) : (
                <></>
              )}
              <BalanceContainer onClick={dispatchShowCashierDrawer}>
                <CurrentBalanceComponent />
                <IconContainer>
                  <StyledPlusCircleFilledIcon />
                </IconContainer>
              </BalanceContainer>
              <DropdownContainer>
                <Dropdown overlay={menu}>
                  <UserIcon
                    src={userIconSrc}
                    onMouseOver={() => setUserIconSrc(userHoverIcon)}
                    onMouseOut={() => setUserIconSrc(userIcon)}
                  />
                </Dropdown>
              </DropdownContainer>
            </>
          ) : (
            <>
              <LoginButtonComponent />
              {/* // hiding signup button due to vie.gg shut down */}
              {/* <SignupButtonComponent /> */}
            </>
          )}
        </RightMenu>
      </Header>
    </>
  );
};

export { HeaderComponent };
