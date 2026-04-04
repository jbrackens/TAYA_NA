import { useCallback } from "react";
import { useRouteMatch, useLocation, useHistory } from "react-router-dom";

interface State {
  hasPrevRoute: boolean;
}

export function useCloseDrawer() {
  const location = useLocation<State>();
  const history = useHistory();
  const match = useRouteMatch();

  const { state, pathname } = location;

  return useCallback(() => {
    if (state && state.hasPrevRoute) {
      history.goBack();
    } else {
      // handling case when opening new tab by url without browser history
      const [, , page] = pathname.split("/");
      history.replace(`${match.url}/${page}`);
    }
  }, [state, pathname, history, match.url]);
}
