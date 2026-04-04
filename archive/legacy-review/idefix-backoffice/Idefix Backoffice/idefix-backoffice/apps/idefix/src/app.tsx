import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Provider } from "react-redux";
import { FC } from "react";
import { BrowserRouter } from "react-router-dom";

import { createStore, authenticationSlice, dialogsSlice, playerSlice } from "@idefix-backoffice/idefix/store";
import { ErrorBoundary } from "@idefix-backoffice/idefix/components";
import api from "@idefix-backoffice/idefix/api";

import { AppRoutes } from "./routes";
import { ThemeProvider } from "./theme";

const store = createStore();
api.initialize({
  initializeStore: store,
  requireAuthAction: authenticationSlice.authenticationRequired,
  openDialog: dialogsSlice.openDialog,
  handlePlayerStatusUpdate: playerSlice.handlePlayerStatusUpdate
});

const App: FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
};

export { App };
