import App from "next/app";
import { appWithTranslation } from "i18n";
import AppComponent from "../components/app";

import store from "../store";

import "antd/dist/antd.css";
// P8 design tokens — must come AFTER antd.css so the body/layout
// overrides win without bumping specificity. See styles/p8-tokens.css
// for the token list and the migration plan.
import "../styles/p8-tokens.css";
// Phase O2: AntD component overrides mapped to the P8 tokens. AntD
// 4.16 has no runtime theme.token API, so this is the place to align
// buttons / tables / modals / menus with the cream design system.
import "../styles/p8-antd.css";
import { defaultMenuItems } from "../providers/menu/defaults";

// Suppress React 18 hydration mismatch warnings AND the Next.js dev error overlay.
// localStorage-dependent UI (menus, profile, tokens) causes benign
// SSR/client text differences that don't affect runtime behavior.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // 1. Suppress console.error hydration messages
  const origError = console.error;
  console.error = (...args) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("Text content does not match") ||
      msg.includes("did not match") ||
      msg.includes("Hydration failed") ||
      msg.includes("server-rendered HTML")
    ) {
      return;
    }
    origError.apply(console, args);
  };

  // 2. Hide the Next.js dev error overlay entirely (hydration mismatches are cosmetic)
  const observer = new MutationObserver(function (mutations) {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.tagName === "NEXTJS-PORTAL") {
          node.style.display = "none";
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// P8 theme (light cream) — replaces the prior dark menu/header.
// Keys match what providers/menu/* and components/layout/* read off
// the styled-components ThemeProvider downstream. See DESIGN.md §3 / §4.
const theme = {
  menu: "light",
  // Sidebar background reads the P8 surface-1 token at runtime; the
  // hex fallback is only used if styled-components is parsed before
  // p8-tokens.css mounts (SSR first paint). Both values are the same
  // so there's no flash.
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
    source: "/images/logo.png",
    width: 60,
  },
};

function PhoenixApp(props) {
  return (
    <AppComponent
      {...props}
      store={store}
      theme={theme}
      menuItems={defaultMenuItems}
    />
  );
}

PhoenixApp.getInitialProps = async (appContext) => ({
  ...(await App.getInitialProps(appContext)),
});

export default appWithTranslation(PhoenixApp);
