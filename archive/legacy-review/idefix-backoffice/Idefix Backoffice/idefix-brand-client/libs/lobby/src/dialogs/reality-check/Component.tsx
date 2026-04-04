import React from "react";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";
import Router from "next/router";

interface Props {
  statistics: {
    AmountWin?: string;
    AmountLost?: string;
    PlayTimeMinutes: number;
  };
  onContinue: () => void;
}

const Component = ({
  statistics: { AmountWin, AmountLost, PlayTimeMinutes },
  onContinue
}: Props) => {
  const { SnackbarModal } = useRegistry();

  const messages = useMessages({
    hi: "active-game.pop-up.reminder-hi",
    winnings: {
      id: "active-game.pop-up.winnings",
      values: {
        minutes: PlayTimeMinutes,
        result: AmountWin
      }
    },
    losses: {
      id: "active-game.pop-up.losses",
      values: {
        minutes: PlayTimeMinutes,
        result: AmountLost
      }
    },
    confirm: "active-game.pop-up.confirm",
    logout: "active-game.pop-up.logout",
    continue: "active-game.pop-up.continue"
  });

  return (
    <SnackbarModal
      title={messages.hi}
      content={
        (AmountWin ? messages.winnings : AmountLost ? messages.losses : "") +
        "\n\n" +
        messages.confirm
      }
      action={{
        actionTitle: messages.continue,
        onActionClick: onContinue
      }}
      close={{
        closeTitle: messages.logout,
        onClose: () => Router.replace("/logout")
      }}
    />
  );
};

export default Component;
