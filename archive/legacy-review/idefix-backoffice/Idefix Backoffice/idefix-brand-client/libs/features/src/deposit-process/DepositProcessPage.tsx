import * as React from "react";
import { NextPage } from "next";
import { LobbyNextContext, LobbyState } from "@brandserver-client/lobby";
import { redirect } from "@brandserver-client/utils";
import DepositProcess from "./DepositProcess";

interface IProps {
  status?: "failed" | "pending" | "complete" | undefined;
  transactionId?: string | undefined;
}

interface PageContext extends LobbyNextContext<LobbyState> {
  query: {
    transactionId?: string;
  };
}

const DepositProcessPage: NextPage<IProps, IProps> = ({
  status,
  transactionId
}) => <DepositProcess status={status} id={transactionId} />;

DepositProcessPage.getInitialProps = async (ctx: PageContext) => {
  const {
    query: { transactionId },
    lobby: { api }
  } = ctx;

  try {
    if (transactionId) {
      const response = await api.deposit.getDepositProcess(
        transactionId as string
      );

      if (!response.status || response.status === "failed") {
        throw new Error("Status not found");
      }

      if (response.status === "complete") {
        redirect(ctx, "/loggedin/myaccount/deposit-done");
      }

      return { status: response.status, transactionId };
    }

    return {};
  } catch (err) {
    redirect(ctx, "/loggedin/myaccount/deposit-failed");
    return {};
  }
};

export default DepositProcessPage;
