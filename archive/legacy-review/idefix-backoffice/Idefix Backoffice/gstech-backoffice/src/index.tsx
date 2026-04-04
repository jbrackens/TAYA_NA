import React from "react";
import ReactDOM from "react-dom";
import { HistoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ThemeProvider } from "@material-ui/styles";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";
import history from "js/history";
import AppRoutes from "./js/routes";
import createStore from "./js/createStore";
import api from "./js/core/api";

import { theme } from "./js/theme/theme";
import { ErrorBoundaryComponent } from "./js/core/components/error-boundary";

export type AppDispatch = typeof store.dispatch;

const store = createStore();
api.initialize(store);

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <MuiPickersUtilsProvider utils={MomentUtils}>
      <Provider store={store}>
        <HistoryRouter history={history}>
          <ErrorBoundaryComponent>
            <AppRoutes />
          </ErrorBoundaryComponent>
        </HistoryRouter>
      </Provider>
    </MuiPickersUtilsProvider>
  </ThemeProvider>,
  document.getElementById("root"),
);
