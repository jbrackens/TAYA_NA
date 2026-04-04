import * as React from "react";
import { TransactionHistory as TransactionHistoryType } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { MyAccountPage } from "@brandserver-client/lobby";
import { withInitialProps } from "../with-initial-props";
import TransactionHistory from "./TransactionHistory";

interface IProps {
  isLoading: boolean;
  data: TransactionHistoryType | undefined;
}

const History: MyAccountPage<IProps, TransactionHistoryType> = ({
  data,
  isLoading
}) => {
  const { Loader } = useRegistry();

  if (isLoading || !data) {
    return <Loader />;
  }

  return <TransactionHistory history={data} />;
};

History.fetchInitialProps = async ({ lobby: { api } }) => {
  const history = await api.transactionHistory.getTransactionHistory();
  return history;
};

export default withInitialProps(History);
