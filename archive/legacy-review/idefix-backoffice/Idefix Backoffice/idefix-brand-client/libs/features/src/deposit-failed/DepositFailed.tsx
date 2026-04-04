import * as React from "react";
import { DepositResult } from "../deposit-result";

export const DepositFailed = () => (
  <DepositResult
    status={DepositResult.Status.failure}
    titleId="my-account.deposit-failed.title"
    subtitleId="my-account.deposit-failed.tryagain"
    buttonMessageId="my-account.deposit-failed.tryagain.cta"
    href="/loggedin/myaccount/deposit"
    as="/loggedin/myaccount/deposit"
  />
);
