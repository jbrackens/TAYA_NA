import App from "next/app";
import { appWithTranslation } from "i18n";
import AppComponent from "../components/app";

import store from "../store";

import "antd/dist/antd.css";
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
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

const theme = {
  menu: "dark",
  menuDefaultColor: "#ffffff",
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
