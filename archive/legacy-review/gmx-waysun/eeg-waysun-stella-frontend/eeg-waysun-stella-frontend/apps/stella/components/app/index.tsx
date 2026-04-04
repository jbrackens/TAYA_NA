import React from "react";
import { ThemeProvider } from "styled-components";
import { LayoutComponent } from "../layout";
import AuthChecker from "./AuthChecker";
import { GlobalStyle } from "./index.styled";
import { Provider } from "react-redux";
import store from "../../store";
import { theme } from "ui/theme";

export default function App({ Component, pageProps }: any) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Provider store={store}>
        <AuthChecker>
          {pageProps.disableLayout ? (
            <Component {...pageProps} />
          ) : (
            <LayoutComponent>
              <Component {...pageProps} />
            </LayoutComponent>
          )}
        </AuthChecker>
      </Provider>
    </ThemeProvider>
  );
}
