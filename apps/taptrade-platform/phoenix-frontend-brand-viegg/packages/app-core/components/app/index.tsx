import React from "react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MenuProvider } from "../../providers/menu";
import ApiWrapper from "../api-wrapper/index";
import { GlobalStyle } from "./index.styled";
import { Layout } from "../layout";
import { SportsbookLayout } from "../redesign/sportsbook-layout";
import { PredictionLayout } from "../redesign/prediction-layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({
  Component,
  pageProps,
  store,
  theme,
  menuItems = [],
  layoutConfig,
}: any) {
  const layoutVariant = pageProps.layoutVariant;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MenuProvider value={menuItems}>
          <ApiWrapper
            {...pageProps}
            disableWebsocket={pageProps.disableWebsocket}
          >
            <>
              {pageProps.disableLayout ? (
                <Component {...pageProps} menuItems={menuItems} />
              ) : layoutVariant === "sportsbook-redesign" ? (
                <SportsbookLayout>
                  <Component {...pageProps} menuItems={menuItems} />
                </SportsbookLayout>
              ) : layoutVariant === "prediction-redesign" ? (
                <PredictionLayout>
                  <Component {...pageProps} menuItems={menuItems} />
                </PredictionLayout>
              ) : (
                <Layout {...layoutConfig}>
                  <Component {...pageProps} menuItems={menuItems} />
                </Layout>
              )}
            </>
          </ApiWrapper>
        </MenuProvider>
      </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
