import React from "react";
import { Provider } from "react-redux";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { MenuProvider } from "../../providers/menu";
import ApiWrapper from "../api-wrapper/index";
import { GlobalStyle } from "./index.styled";
import { Layout } from "../layout";
import { Store } from "redux";
import { MenuItem } from "../../providers/menu/types";

interface PageProps {
  disableWebsocket?: boolean;
  disableGeoComply?: boolean;
  disableLayout?: boolean;
  [key: string]: unknown;
}

interface AppProps {
  Component: React.ComponentType<Record<string, unknown>>;
  pageProps: PageProps;
  store: Store;
  theme: DefaultTheme;
  menuItems?: MenuItem[];
  layoutConfig?: { home?: boolean; children?: React.ReactNode };
}

export default function App({
  Component,
  pageProps,
  store,
  theme,
  menuItems = [],
  layoutConfig,
}: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      {/* overriding modals etc */}
      <GlobalStyle />
      <Provider store={store}>
        <MenuProvider value={menuItems}>
          <ApiWrapper
            disableWebsocket={pageProps.disableWebsocket ?? false}
            disableGeoComply={pageProps.disableGeoComply ?? false}
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
