import App from "next/app";
import { appWithTranslation } from "i18n";
import AppComponent from "../components/app";
import { theme } from "../core-theme";
import store from "../store";
import Head from "next/head";
import "antd/dist/antd.css";
import { detaultMenuItems } from "../providers/menu/defaults";
import { useEffect } from "react";
import TagManager from "react-gtm-module";

// Suppress React 18 hydration mismatch warnings AND the Next.js dev error overlay.
// localStorage-dependent UI causes benign SSR/client text differences.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
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

const layoutConfig = {};

function PhoenixApp(props) {
  useEffect(() => {
    TagManager.initialize({ gtmId: "GTM-PJSSBJG" });
  }, []);

  return (
    <>
      <Head>
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="https://cdn.vie.gg/phoenix/static/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="https://cdn.vie.gg/phoenix/static/images/favicon-16x16.png"
        />
        <script
          type="text/javascript"
          src="/js/geocomply/geocomply-client.min.js"
        ></script>
        <script
          type="text/javascript"
          src="https://stg-cdn.geocomply.com/oobee/v2.18/oobee.js"
        ></script>
      </Head>
      <AppComponent
        {...props}
        store={store}
        theme={theme}
        menuItems={detaultMenuItems}
        layoutConfig={layoutConfig}
      />
    </>
  );
}

PhoenixApp.getInitialProps = async (appContext) => ({
  ...(await App.getInitialProps(appContext)),
});

export default appWithTranslation(PhoenixApp);
