import React, { ReactNode, useContext, useState, useEffect } from "react";
import { LayoutContent, LayoutWrapper } from "./index.styled";
import { SidebarComponent } from "./sidebar";
import MenuContext from "../../providers/menu";
import { isEmpty } from "lodash";
import { notification } from "antd";
import { useTranslation } from "i18n";
import dynamic from "next/dynamic";

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
    <LayoutWrapper className="layout" $fullscreen={true}>
      {!isAuth && <HeaderComponentWithNoSSR menu={menu} />}
      <LayoutWrapper>
        {!isAuth && sidebarVisible && (
          <SidebarComponent
            menu={menu}
            onVisibilityChange={updateSidebarVisibility}
          />
        )}
        <LayoutWrapper $fullscreen={true} $hasSidebar={hasSidebar}>
          <LayoutContent
            className="site-layout-background"
            $hasSidebar={hasSidebar}
          >
            {children}
          </LayoutContent>
        </LayoutWrapper>
      </LayoutWrapper>
    </LayoutWrapper>
  );
};

export { Layout };
