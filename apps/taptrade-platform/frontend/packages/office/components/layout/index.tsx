import React, { ReactNode, useContext, useState, useEffect } from "react";
import { SidebarComponent } from "./sidebar";
import MenuContext from "../../providers/menu";
import { isEmpty } from "lodash";
import { App, Layout as AntdLayout } from "antd";
import { useTranslation } from "i18n";
import dynamic from "next/dynamic";

const { Content } = AntdLayout;

const HeaderComponentWithNoSSR = dynamic(import("./header"), {
  ssr: false,
});

type LayoutComponentProps = {
  children: ReactNode;
  home?: Boolean | undefined;
  isAuth?: Boolean | undefined;
};

const Layout: React.FC<LayoutComponentProps> = ({
  children,
  isAuth,
}: LayoutComponentProps) => {
  const { t } = useTranslation(["common", "error"]);
  const [sidebarVisible, setSidebarVisibility] = useState(true);
  const menu = useContext(MenuContext);
  const hasSidebar = !isAuth && !isEmpty(menu) && sidebarVisible;
  const { notification } = App.useApp();

  const updateSidebarVisibility = (visible: boolean) => {
    setSidebarVisibility(visible);
  };

  useEffect(() => {
    const handleAlertDisplay = (event: Event) => {
      const { detail } = event as CustomEvent;
      notification.error({
        message: t("NOTIFICATIONS_ERROR_HEADER"),
        description: (
          <>
            {detail.payload?.errors.map((error: { errorCode: string }) => (
              <div key={error.errorCode}>{t(`error:${error.errorCode}`)}</div>
            ))}
          </>
        ),
      });
    };
    window.addEventListener("alert", handleAlertDisplay);
    return () => window.removeEventListener("alert", handleAlertDisplay);
  }, []);

  return (
    <AntdLayout className="layout h-full">
      {!isAuth && <HeaderComponentWithNoSSR menu={menu} />}
      <AntdLayout>
        {!isAuth && sidebarVisible && (
          <SidebarComponent
            menu={menu}
            onVisibilityChange={updateSidebarVisibility}
          />
        )}
        <AntdLayout
          className={hasSidebar ? "h-full pb-6 pl-56 pr-6 pt-16" : "h-full"}
        >
          <Content
            className={[
              "site-layout-background m-0 flex min-h-screen flex-col",
              hasSidebar ? "p-6" : "px-12 pb-6 pt-[88px]",
            ].join(" ")}
          >
            {children}
          </Content>
        </AntdLayout>
      </AntdLayout>
    </AntdLayout>
  );
};

export { Layout };
