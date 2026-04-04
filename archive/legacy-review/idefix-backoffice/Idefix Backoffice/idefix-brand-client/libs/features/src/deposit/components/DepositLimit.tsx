import * as React from "react";
import { format } from "date-fns";
import { DepositLimit as DepositLimitType } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

interface Props {
  limit: DepositLimitType;
  onCancelLimit: (limit: DepositLimitType) => Promise<void>;
}

const DepositLimit: React.FC<Props> = ({ limit, onCancelLimit }) => {
  const { NotifyMessage } = useRegistry();

  const { canBeCancelled, permanent, description, expires } = limit;

  const expiresDate = new Date(expires);

  const expireTime = `${format(expiresDate, "d.M.yyyy")}, ${format(
    expiresDate,
    "H:mm"
  )}`;

  const messages = useMessages({
    permanent: {
      id: "my-account.deposit-limit.permanent",
      values: { description }
    },
    cancelLimit: "my-account.deposit-limit.cancel",
    expiring: {
      id: "my-account.deposit-limit.expiring",
      values: { description, expireTime }
    }
  });

  if (!canBeCancelled && permanent) {
    return <NotifyMessage>{messages.permanent}</NotifyMessage>;
  }

  if (canBeCancelled && permanent) {
    return (
      <NotifyMessage>
        <>
          {messages.permanent}{" "}
          <span onClick={() => onCancelLimit(limit)}>
            {messages.cancelLimit}
          </span>
        </>
      </NotifyMessage>
    );
  }

  if (!canBeCancelled && !permanent) {
    return <NotifyMessage>{messages.expiring}</NotifyMessage>;
  }

  if (canBeCancelled && !permanent) {
    return (
      <NotifyMessage>
        <>
          {messages.expiring}{" "}
          <span onClick={() => onCancelLimit(limit)}>
            {messages.cancelLimit}
          </span>
        </>
      </NotifyMessage>
    );
  }

  return null;
};

export { DepositLimit };
