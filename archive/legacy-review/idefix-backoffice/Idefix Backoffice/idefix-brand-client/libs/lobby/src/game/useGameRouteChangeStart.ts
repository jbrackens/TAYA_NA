import * as React from "react";
import { useDispatch } from "react-redux";
import { useRouterEventListener } from "@brandserver-client/hooks";
import { setActiveGameCategory, setSearchQuery } from "../games";

/**
 * This hook reset games search query and active category state to initial when url doesn't equal /loggedin
 */

export function useGameRouteChangeStart() {
  const dispatch = useDispatch();

  const handleRouteChange = React.useCallback((url: string) => {
    if (url !== "/loggedin") {
      dispatch(setActiveGameCategory("all"));
      dispatch(setSearchQuery(""));
    }
  }, []);

  useRouterEventListener("routeChangeStart", handleRouteChange);
}
