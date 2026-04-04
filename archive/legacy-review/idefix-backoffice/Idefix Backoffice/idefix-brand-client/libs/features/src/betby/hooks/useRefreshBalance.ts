import { useInterval } from "@brandserver-client/hooks";
import { useCallback, useContext } from "react";
import { ApiContext } from "@brandserver-client/api";
import { REFRESH_BALANCE_INTERVAL_DELAY } from "../constants";

function useRefreshBalance(isLoggedIn: boolean, isBetby: boolean) {
  const api = useContext(ApiContext);

  const fetchBalance = useCallback(async () => {
    try {
      await api.balance.getBalance();
    } catch (error) {
      console.log(error, "error");
    }
  }, []);

  useInterval(
    fetchBalance,
    isBetby && isLoggedIn ? REFRESH_BALANCE_INTERVAL_DELAY : null
  );
}

export { useRefreshBalance };
