import { useCallback, useContext, useEffect, useState } from "react";
import { ApiContext } from "@brandserver-client/api";
import { StartGameOptions, Update } from "@brandserver-client/types";
import { BETBY_GAME_ID } from "../constants";

function useBetbyGame(isLoggedIn: boolean): StartGameOptions | undefined {
  const api = useContext(ApiContext);
  const [betbyOptions, setBetbyOptions] = useState<
    StartGameOptions | undefined
  >(undefined);

  const handleBetbyGameResponse = ({
    startGameOptions
  }: {
    startGameOptions: StartGameOptions;
    update: Update;
  }) => {
    if (startGameOptions.ok === false) {
      throw new Error(startGameOptions.result);
    }

    const { GameURL, ForceFullscreen } = startGameOptions;

    if (ForceFullscreen) {
      return window.location.replace(GameURL);
    }

    setBetbyOptions(startGameOptions);
  };

  const handleBetbyGameError = (error: Error) => {
    console.error(error);
  };

  const fetchPrivateGame = useCallback(() => {
    api.game
      .startGame(BETBY_GAME_ID)
      .then(handleBetbyGameResponse)
      .catch(handleBetbyGameError);
  }, []);

  const fetchPublicGame = useCallback(() => {
    api.game
      .startFreeGame(BETBY_GAME_ID)
      .then(handleBetbyGameResponse)
      .catch(handleBetbyGameError);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchPrivateGame();
    } else {
      fetchPublicGame();
    }
  }, [isLoggedIn]);

  return betbyOptions;
}

export { useBetbyGame };
