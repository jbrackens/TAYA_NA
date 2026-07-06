"use client";

import { App as AntdApp } from "antd";
import { Provider } from "react-redux";
import { ThemeProvider } from "../components/app/theme-context";
import { MenuProvider } from "../providers/menu";
import { defaultMenuItems } from "../providers/menu/defaults";
import store from "../store";

const appRouterTheme = {
  menu: "light",
  menuBg: "var(--surface-1, #ffffff)",
  menuDefaultColor: "var(--t1, #1a1a1a)",
  menuActiveColor: "var(--focus-ring, #0e7a53)",
  menuActiveBg: "var(--accent-soft, rgba(43, 228, 128, 0.14))",
  headerBg: "var(--surface-1, #ffffff)",
  headerBorder: "var(--border-1, #e5dfd2)",
  headerText: "var(--t1, #1a1a1a)",
  pageBg: "var(--bg-deep, #f7f3ed)",
  cardBg: "var(--surface-1, #ffffff)",
  cardBorder: "var(--border-1, #e5dfd2)",
  text1: "var(--t1, #1a1a1a)",
  text2: "var(--t2, #4a4a4a)",
  accent: "var(--accent, #2be480)",
  accentText: "var(--focus-ring, #0e7a53)",
  logo: {
    width: 92,
  },
};

export default function AppRouterProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdApp>
      <ThemeProvider theme={appRouterTheme}>
        <Provider store={store}>
          <MenuProvider value={defaultMenuItems}>{children}</MenuProvider>
        </Provider>
      </ThemeProvider>
    </AntdApp>
  );
}
