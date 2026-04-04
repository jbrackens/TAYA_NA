import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { endGame, startGame } from "../slice";

// TODO: fix types for dispatch
const useLaunchGame = (gameId: string | undefined, isFreeGame: boolean) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(startGame(gameId, isFreeGame) as any);

    return () => {
      dispatch(endGame(isFreeGame) as any);
    };
  }, [gameId, isFreeGame]);
};

export { useLaunchGame };
