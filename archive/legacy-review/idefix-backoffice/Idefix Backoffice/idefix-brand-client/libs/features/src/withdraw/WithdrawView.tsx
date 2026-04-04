import * as React from "react";
import {
  PaymentMethod,
  WithdrawalFeeConfiguration
} from "@brandserver-client/types";
import WithdrawActivation from "./components/WithdrawActivation";
import WithdrawBalance from "./components/WithdrawBalance";
import WithdrawRequest from "./components/WithdrawRequest";

interface Props {
  displayProps: {
    verifiable: boolean;
    pending: boolean;
    methods: {
      id: number;
      clearing_house: string;
      currency: string;
      bank_name: string;
      logo: string;
    }[];
    docsNeeded: boolean;
    activated?: boolean;
    checked: boolean;
  };
  balance?: string;
  activationSend: boolean;
  withdrawalOptions: PaymentMethod[];
  withdrawalFee?: WithdrawalFeeConfiguration;
  onActivationSend: () => void;
  onBankIdentify: (id: string) => void;
}

const WithdrawView: React.FC<Props> = ({
  displayProps: {
    activated,
    verifiable,
    pending,
    docsNeeded,
    checked,
    methods
  },
  balance,
  activationSend,
  withdrawalOptions,
  withdrawalFee,
  onActivationSend,
  onBankIdentify
}) => {
  const action = {
    href: "/loggedin/myaccount/inbox/[notificationId]",
    as: "/loggedin/myaccount/inbox/1"
  };

  if (!activated) {
    return (
      <WithdrawActivation
        action={action}
        titleFormattedMessage="my-account.withdraw.kyc.title"
        infoFormattedMessage="my-account.withdraw.kyc.content-activate"
        activationSend={activationSend}
        onActivationSend={onActivationSend}
      />
    );
  }

  if (!checked && pending && !docsNeeded) {
    return (
      <WithdrawActivation
        action={action}
        infoFormattedMessage="my-account.withdraw.kyc.verify.pending"
      />
    );
  }

  if (!checked && pending && docsNeeded) {
    return (
      <WithdrawActivation
        action={action}
        infoFormattedMessage="my-account.withdraw.kyc.verify.bankneeded"
      />
    );
  }

  if (!checked && !verifiable) {
    return (
      <WithdrawActivation
        action={action}
        titleFormattedMessage="my-account.withdraw.kyc.title"
        infoFormattedMessage="my-account.withdraw.kyc.content"
      />
    );
  }

  if (!checked && verifiable) {
    return (
      <WithdrawActivation
        titleFormattedMessage="my-account.my-profile.verification"
        infoFormattedMessage="my-account.withdraw.kyc.verify"
        onBankIdentify={onBankIdentify}
        methods={methods}
      />
    );
  }

  if (checked && balance && withdrawalOptions.length === 0) {
    return <WithdrawBalance balance={balance} showInfo={true} />;
  }

  if (checked && balance && withdrawalOptions.length !== 0) {
    return (
      <WithdrawRequest
        withdrawalOptions={withdrawalOptions}
        withdrawalFee={withdrawalFee}
      />
    );
  }

  return null;
};

export default WithdrawView;
