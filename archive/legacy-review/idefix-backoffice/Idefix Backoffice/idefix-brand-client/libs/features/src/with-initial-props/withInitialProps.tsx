import * as React from "react";
import { useDispatch } from "react-redux";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { isServer } from "@brandserver-client/utils";
import { ApiContext } from "@brandserver-client/api";
import isEmpty from "lodash/isEmpty";
import type {
  LobbyNextContext,
  LobbyState,
  MyAccountPage as MyAccountPageType
} from "@brandserver-client/lobby";

export function withInitialProps<T>(
  MyAccountPage: MyAccountPageType<
    {
      data: T | undefined;
      isLoading: boolean;
      onSetData: React.Dispatch<React.SetStateAction<T | undefined>>;
    },
    T
  >
) {
  const WithInitialProps: NextPage<
    { initialProps?: T },
    { initialProps?: T }
  > = props => {
    const router = useRouter();
    const dispatch = useDispatch();
    const api = React.useContext(ApiContext);
    const [isLoading, setIsLoading] = React.useState(false);

    const [data, setData] = React.useState<T | undefined>(
      !isEmpty(props) ? props.initialProps : undefined
    );

    const { query } = router;

    const fetchData = React.useCallback(async () => {
      try {
        const ctx = {
          lobby: { api, store: { dispatch } },
          query
        };
        setIsLoading(true);
        const newData = await MyAccountPage.fetchInitialProps(ctx);
        setData(newData);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    }, [query]);

    React.useEffect(() => {
      if (!data) {
        fetchData();
      }

      const handleRouteChange = async (url: string) => {
        if (router.asPath === url) {
          fetchData();
        }
      };

      router.events.on("routeChangeStart", handleRouteChange);

      return () => {
        router.events.off("routeChangeStart", handleRouteChange);
      };
    }, []);

    return (
      <MyAccountPage data={data} isLoading={isLoading} onSetData={setData} />
    );
  };

  WithInitialProps.getInitialProps = async (
    ctx: LobbyNextContext<LobbyState>
  ) => {
    if (MyAccountPage.fetchInitialProps && isServer) {
      const initialProps = await MyAccountPage.fetchInitialProps(ctx);
      return { initialProps };
    }

    return {};
  };

  WithInitialProps.displayName = `WithInitialProps(${getDisplayName<T>(
    MyAccountPage
  )})`;

  return WithInitialProps;
}

function getDisplayName<T>(
  WrappedComponent: MyAccountPageType<
    {
      data: T | undefined;
      isLoading: boolean;
      onSetData: React.Dispatch<React.SetStateAction<T | undefined>>;
    },
    T
  >
) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}
