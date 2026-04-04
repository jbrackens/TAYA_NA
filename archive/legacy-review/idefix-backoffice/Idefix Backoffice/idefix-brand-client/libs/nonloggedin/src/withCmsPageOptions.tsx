import {
  fetchCmsPageOptions,
  fetchFreeGames,
  getGames,
  getPageOptions,
  LobbyNextContext,
  LobbyState
} from "@brandserver-client/lobby";
import { CmsPageOptions } from "@brandserver-client/types";
import { redirect } from "@brandserver-client/utils";
import { NextPage } from "next";
import * as React from "react";

export type WrappedComponentProps = {
  pageOptions: CmsPageOptions;
};

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = {};

export function withCmsPageOptions(
  PageComponent: NextPage<WrappedComponentProps, Props>
) {
  const WrappedComponent: NextPage<WrappedComponentProps, Props> = ({
    pageOptions: newPageOptions,
    ...props
  }) => {
    const [pageOptions, setPageOptions] = React.useState(newPageOptions);

    React.useEffect(() => {
      if (newPageOptions) {
        setPageOptions(newPageOptions);
      }
    }, [newPageOptions]);

    return <PageComponent pageOptions={pageOptions} {...props} />;
  };

  WrappedComponent.getInitialProps = async (
    ctx: LobbyNextContext<LobbyState>
  ) => {
    const {
      asPath,
      lobby: { intl, store }
    } = ctx;

    function getGamesPromise() {
      const brand = process.env.NEXT_PUBLIC_BRAND;
      const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;

      if (
        brand &&
        brand.toLowerCase() !== "sportnation" &&
        brand.toLowerCase() !== "vie"
      ) {
        return undefined;
      }

      if (getGames(store.getState()).length > 0) {
        return getGames(store.getState());
      }

      return store.dispatch(fetchFreeGames(intl?.locale || defaultLocale));
    }

    const [pageOptions, pageProps] = await Promise.all<
      [CmsPageOptions | undefined, {} | undefined, {} | undefined]
    >([
      getPageOptions(store.getState()) ||
        store.dispatch(fetchCmsPageOptions(asPath)),
      PageComponent.getInitialProps && PageComponent.getInitialProps(ctx),
      getGamesPromise()
    ]);

    if (ctx.res && pageOptions && pageOptions.httpStatus) {
      ctx.res.statusCode = pageOptions.httpStatus;
    }

    if (pageOptions && pageOptions.location) {
      return redirect(ctx, pageOptions.location);
    }

    return {
      pageOptions,
      locale: intl ? intl.locale : undefined,
      ...pageProps
    };
  };

  WrappedComponent.displayName = `withCmsPageOptions(${getDisplayName(
    WrappedComponent
  )})`;
  return WrappedComponent;
}

function getDisplayName(WrappedComponent: {
  displayName?: string;
  name?: string;
}) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}
