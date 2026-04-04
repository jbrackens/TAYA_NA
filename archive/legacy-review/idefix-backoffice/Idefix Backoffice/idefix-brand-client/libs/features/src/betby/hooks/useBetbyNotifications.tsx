import { useEffect } from "react";
import { useSelector } from "react-redux";

import { useRegistry } from "@brandserver-client/ui";
import { callSnackbar } from "@brandserver-client/utils";
import { getNumberFromString } from "@brandserver-client/utils";
import { useMessages } from "@brandserver-client/hooks";
import { getUpdate } from "@brandserver-client/lobby";

function useBetbyNotifications() {
  const { Snackbar } = useRegistry();
  const {
    balance: { CurrentBonusBalance }
  } = useSelector(getUpdate);

  const messages = useMessages({
    bonus: "active-game.pop-up.bonusbalance"
  });

  useEffect(() => {
    const bonusBalance =
      CurrentBonusBalance && Number(getNumberFromString(CurrentBonusBalance));

    bonusBalance &&
      callSnackbar(
        <Snackbar content={messages.bonus} close={{ closeTitle: "OK" }} />
      );
  }, []);
}

export { useBetbyNotifications };
