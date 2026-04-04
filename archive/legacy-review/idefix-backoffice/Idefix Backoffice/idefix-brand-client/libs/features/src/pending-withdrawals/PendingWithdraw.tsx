import * as React from "react";
import styled from "styled-components";
import { PendingWithdraw as PendingWithdrawType } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

const StyledPendingWithdraw = styled.div`
  width: 100%;
  max-width: 680px;
  background: ${({ theme }) => theme.palette.secondaryLightest};
  border-radius: 10px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .withdraw__amount {
    ${({ theme }) => theme.typography.text16Bold};
    color: ${({ theme }) => theme.palette.primary};
  }

  .withdraw__name {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .withdraw__cancel-button {
    height: 40px;
    padding: 13px;
  }

  .withdraw__loader {
    width: 40px;
    height: 40px;
  }
`;

interface Props {
  withdraw: PendingWithdrawType;
  onCancel: (id: string) => Promise<void>;
}

const PendingWithdraw: React.FC<Props> = ({
  withdraw: { Amount, UniqueTransactionID, PaymentMethodName, WithdrawalFee },
  onCancel
}) => {
  const [loading, setLoading] = React.useState<boolean>();
  const { Button, Loader } = useRegistry();
  const messages = useMessages({
    fee: "my-account.withdraw.withdraw.withdrawal-fee",
    cancel: "my-account.pending-withdrawals.cancel"
  });

  const handleCancel = React.useCallback(async () => {
    setLoading(true);
    try {
      await onCancel(UniqueTransactionID);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      throw Error(error);
    }
  }, [UniqueTransactionID]);

  return (
    <StyledPendingWithdraw>
      <div className="withdraw__info">
        <div className="withdraw__amount">{Amount}</div>
        <div className="withdraw__name">
          {PaymentMethodName}{" "}
          {WithdrawalFee && `(${messages.fee} ${WithdrawalFee})`}
        </div>
      </div>
      {loading ? (
        <Loader className="withdraw__loader" />
      ) : (
        <div>
          <Button
            color={Button.Color.accent}
            className="withdraw__cancel-button"
            onClick={handleCancel}
          >
            {messages.cancel}
          </Button>
        </div>
      )}
    </StyledPendingWithdraw>
  );
};

export default PendingWithdraw;
