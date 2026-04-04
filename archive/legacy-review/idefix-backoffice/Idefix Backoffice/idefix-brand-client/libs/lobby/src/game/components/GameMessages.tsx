import { useMessages } from "@brandserver-client/hooks";
import { StartGameOptions } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { callSnackbar } from "@brandserver-client/utils";
import React, { FC, useEffect } from "react";

interface Props {
  startGameOptions?: StartGameOptions;
}

const GameMessages: FC<Props> = ({ startGameOptions }) => {
  const messages = useMessages({
    overlimitbets: "active-game.pop-up.overlimitbets",
    outsideMalta: "game.outside.malta"
  });

  const { Snackbar } = useRegistry();

  useEffect(() => {
    if (!startGameOptions) return;

    const { MaltaJurisdiction, usingbonusmoney } = startGameOptions;

    usingbonusmoney &&
      callSnackbar(
        <Snackbar
          content={messages.overlimitbets}
          close={{ closeTitle: "OK" }}
        />,
        { autoClose: true }
      );

    !MaltaJurisdiction &&
      callSnackbar(
        <Snackbar
          content={messages.outsideMalta}
          close={{ closeTitle: "OK" }}
        />,
        { autoClose: true }
      );
  }, [startGameOptions]);

  return null;
};

export { GameMessages };
