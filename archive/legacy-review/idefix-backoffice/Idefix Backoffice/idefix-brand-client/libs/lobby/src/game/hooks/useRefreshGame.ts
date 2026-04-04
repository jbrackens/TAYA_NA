import { useRef } from "react";
import { ApiContext } from "@brandserver-client/api";
import { useContext, useEffect } from "react";

function useRefreshGame(
  currentGameId: string | undefined,
  isFreeGame: boolean
) {
  const api = useContext(ApiContext);

  const interval = useRef<undefined | NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (!currentGameId || isFreeGame) return;

    interval.current = setInterval(() => {
      api.game.refreshGame(currentGameId);
    }, 20000);

    return () => {
      if (interval.current) {
        clearInterval(interval.current);
      }
    };
  }, [currentGameId]);
}

export { useRefreshGame };
