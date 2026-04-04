import { ApiError, ApiProvider } from "@brandserver-client/api";
import { pushRoute } from "@brandserver-client/utils";
import * as React from "react";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import { openErrorDialog } from "../error-dialog/duck";
import LiveAgent from "../live-agent";
import { Lobby } from "./types";
import { Info } from "../info-dialog";
import { openInfoDialog } from "../info-dialog/duck";

// TODO: fix TS error
const IntlProviderWrapper = IntlProvider as any;

interface Props<S> {
  lobby: Lobby<S>;
  defaultLocale?: string;
  children: React.ReactNode | React.ReactNodeArray;
}

// TODO: cleanup provider + rename it to the appProvie

export function LobbyProvider<S>({
  lobby: { api, store, intl },
  defaultLocale = "en",
  children
}: Props<S>) {
  React.useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.pushRoute = pushRoute;
    window.showErrorDialog = (message: string) => {
      const error = new ApiError(message, 400);
      store.dispatch(openErrorDialog(error));
    };
    window.showInfo = (info: Info) => {
      store.dispatch(openInfoDialog(info));
    };
  }, []);

  return (
    <ApiProvider api={api}>
      <Provider store={store}>
        <IntlProviderWrapper
          locale={intl ? intl.locale : "en"}
          messages={intl ? intl.messages : {}}
          defaultLocale={defaultLocale}
        >
          <>
            <LiveAgent />
            {children}
          </>
        </IntlProviderWrapper>
      </Provider>
    </ApiProvider>
  );
}
