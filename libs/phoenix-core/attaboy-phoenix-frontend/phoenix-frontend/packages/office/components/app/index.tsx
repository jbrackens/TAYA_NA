import React from "react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { MenuProvider } from "../../providers/menu";
import SessionGuard from "../auth/session-guard/index";
import { useRouter } from "next/router";

export default function App({
  Component,
  pageProps,
  store,
  theme,
  menuItems = [],
}: any) {
  const router = useRouter();

  //fixing link which is not scrolling to the top of the page when triggered
  router?.events?.on("routeChangeComplete", () => {
    window.scrollTo(0, 0);
  });

  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <SessionGuard>
          <MenuProvider value={menuItems}>
            <Component {...pageProps} menuItems={menuItems} />
          </MenuProvider>
        </SessionGuard>
      </Provider>
    </ThemeProvider>
  );
}
