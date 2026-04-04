import * as React from "react";
import { NextPage } from "next";
import { DepositResult } from "../deposit-result";
import { LobbyNextContext, LobbyState } from "@brandserver-client/lobby";

const DepositDonePage: NextPage = () => (
  <DepositResult
    status={DepositResult.Status.success}
    titleId="my-account.deposit-done.title"
    buttonMessageId="my-account.deposit-done.cta"
    href="/loggedin"
    as="/loggedin"
  />
);

DepositDonePage.getInitialProps = async ({
  lobby
}: LobbyNextContext<LobbyState>) => {
  await lobby.api.depositDone.getDepositDone();

  return {};
};

export default DepositDonePage;
