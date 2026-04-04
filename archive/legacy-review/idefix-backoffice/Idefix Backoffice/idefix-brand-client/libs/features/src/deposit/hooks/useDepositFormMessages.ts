import { useMessages } from "@brandserver-client/hooks";
import { useDeposit } from "../context";

function useDepositFormMessages() {
  const { selectedDepositMethod } = useDeposit();

  const messages = useMessages({
    chooseMethod: "my-account.deposit.choose-method",
    amount: "my-account.deposit.amount",
    enterAmount: "my-account.deposit.enter-amount",
    deposit: "my-account.deposit.deposit",
    nationalId: "my-account.deposit.nationalId",
    cvv: "my-account.deposit.creditcard.cvv",
    cvvPlaceholder: "my-account.deposit.creditcard.cvv-hint",
    depositFee: {
      id: "my-account.deposit-fee",
      values: { fee: selectedDepositMethod.fee }
    }
  });

  return { messages };
}

export { useDepositFormMessages };
