import { useSelector } from "react-redux";
import { useIsLoggedIn } from "@brandserver-client/hooks";
import { useLaunchGame } from "./hooks/useLaunchGame";
import { useRefreshGame } from "./hooks/useRefreshGame";
import { getGameState } from "./slice";

const useGameModal = (gameId: string | undefined) => {
  const { startGameOptions } = useSelector(getGameState);
  const isLoggedIn = useIsLoggedIn();

  useLaunchGame(gameId, !isLoggedIn);
  useRefreshGame(gameId, !isLoggedIn);

  return {
    gameOptions: startGameOptions
  };
};

export { useGameModal };
