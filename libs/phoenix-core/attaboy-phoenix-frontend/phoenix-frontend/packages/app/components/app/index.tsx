import React from "react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { MenuProvider } from "../../providers/menu";
import ApiWrapper from "../api-wrapper/index";
import { GlobalStyle } from "./index.styled";
import { Layout } from "../layout";

export default function App({
  Component,
  pageProps,
  store,
  theme,
  menuItems = [],
  layoutConfig,
}: any) {
  return (
    <ThemeProvider theme={theme}>
      {/* overriding modals etc */}
      <GlobalStyle />
      <Provider store={store}>
        <MenuProvider value={menuItems}>
          <ApiWrapper
            {...pageProps}
            disableWebsocket={pageProps.disableWebsocket}
          >
            <>
              {pageProps.disableLayout ? (
                <Component {...pageProps} menuItems={menuItems} />
              ) : (
                <Layout {...layoutConfig}>
                  <Component {...pageProps} menuItems={menuItems} />
                </Layout>
              )}
            </>
          </ApiWrapper>
        </MenuProvider>
      </Provider>
    </ThemeProvider>
  );
}
