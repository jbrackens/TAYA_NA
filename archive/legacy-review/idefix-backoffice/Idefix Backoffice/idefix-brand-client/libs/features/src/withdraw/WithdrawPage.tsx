import * as React from "react";
import { Withdraw as WithdrawType } from "@brandserver-client/types";
import { withInitialProps } from "../with-initial-props";
import { MyAccountPage } from "@brandserver-client/lobby";
import { useRegistry } from "@brandserver-client/ui";
import Withdraw from "./Withdraw";

interface IProps {
  data: WithdrawType | undefined;
  isLoading: boolean;
}

const WithdrawPage: MyAccountPage<IProps, WithdrawType> = ({
  data,
  isLoading
}) => {
  const { Loader } = useRegistry();

  if (isLoading || !data) {
    return <Loader />;
  }

  return <Withdraw withdraw={data} />;
};

WithdrawPage.fetchInitialProps = async ({ lobby }) => {
  const withdraw = await lobby.api.withdraw.getWithdraw();
  return withdraw;
};

export default withInitialProps<WithdrawType>(WithdrawPage);
