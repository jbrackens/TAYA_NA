import * as React from "react";
import { configureStore, Store } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";
import { createMemoryHistory, History } from "history";
import { ThemeProvider } from "styled-components";

import rootReducer, { RootState } from "../redux/rootReducer";
import { theme } from "../styled";
import { ConfirmDialogProvider } from "../components";

interface WrapperProps {
  children: React.ReactNode;
  store?: Store<RootState>;
  history?: History;
}

const Wrapper: React.FC<WrapperProps> = ({
  children,
  store = configureStore({ reducer: rootReducer }),
  history = createMemoryHistory()
}) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <ConfirmDialogProvider>
        <Router history={history}>{children}</Router>
      </ConfirmDialogProvider>
    </ThemeProvider>
  </Provider>
);

export { Wrapper };
