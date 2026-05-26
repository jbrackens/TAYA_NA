// AntD v5 + React 19: restores the static Modal.confirm/message/notification
// APIs (rc-util render path React 19 removed). Must load before any antd use.
import "@ant-design/v5-patch-for-react-19";
import App from "next/app";
import { appWithTranslation } from "i18n";
import AppComponent from "../components/app";
import AntdConfigProvider from "../app/lib/antd-config-provider";

import store from "../store";

// AntD v5 is CSS-in-JS — no antd/dist/antd.css (file does not exist in v5).
// P8 design tokens — body/layout overrides win without bumping specificity
// overrides win without bumping specificity. See styles/p8-tokens.css
// for the token list and the migration plan.
import "../styles/p8-tokens.css";
// Phase O2: AntD component overrides mapped to the P8 tokens. AntD
// 4.16 has no runtime theme.token API, so this is the place to align
// buttons / tables / modals / menus with the cream design system.
import "../styles/p8-antd.css";
import { defaultMenuItems } from "../providers/menu/defaults";

// P8 theme (light cream) — replaces the prior dark menu/header.
// Keys match what providers/menu/* and components/layout/* read from the
// local ThemeContext provider downstream. See DESIGN.md §3 / §4.
const theme = {
  menu: "light",
  // Sidebar background reads the P8 surface-1 token at runtime; the
  // hex fallback is only used if this is read before p8-tokens.css mounts
  // during SSR first paint. Both values are the same so there's no flash.
  menuBg: "var(--surface-1, #ffffff)",
  menuDefaultColor: "var(--t1, #1a1a1a)",
  menuActiveColor: "var(--focus-ring, #0e7a53)",
  menuActiveBg: "var(--accent-soft, rgba(43, 228, 128, 0.14))",
  // Header chrome (used by components/layout/Header).
  headerBg: "var(--surface-1, #ffffff)",
  headerBorder: "var(--border-1, #e5dfd2)",
  headerText: "var(--t1, #1a1a1a)",
  // Page surfaces.
  pageBg: "var(--bg-deep, #f7f3ed)",
  cardBg: "var(--surface-1, #ffffff)",
  cardBorder: "var(--border-1, #e5dfd2)",
  text1: "var(--t1, #1a1a1a)",
  text2: "var(--t2, #4a4a4a)",
  accent: "var(--accent, #2be480)",
  accentText: "var(--focus-ring, #0e7a53)",
  logo: {
    source: "/logo-hn.png",
    width: 60,
  },
};

function PhoenixApp(props) {
  return (
    <AntdConfigProvider>
      <AppComponent
        {...props}
        store={store}
        theme={theme}
        menuItems={defaultMenuItems}
      />
    </AntdConfigProvider>
  );
}

PhoenixApp.getInitialProps = async (appContext) => ({
  ...(await App.getInitialProps(appContext)),
});

export default appWithTranslation(PhoenixApp);
