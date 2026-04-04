import { useState, useEffect, useContext } from "react";
import { ApiContext } from "@brandserver-client/api";
import { redirect, pushRoute } from "@brandserver-client/utils";
import { useInterval } from "@brandserver-client/hooks";

function useDepositProcess(
  id: string,
  status: "pending" | "failed" | "complete" | undefined = "pending"
) {
  const api = useContext(ApiContext);
  const [processingTime, setProcessingTime] = useState(3);
  const [depositStatus, setDepositStatus] = useState(status);

  const checkDepositStatus = async (id: string) => {
    try {
      const response = await api.deposit.getDepositProcess(id);
      setDepositStatus(response.status);
    } catch (err) {
      redirect(null, "/loggedin/myaccount/deposit-failed");
    }
  };

  const tick = (depositStatus: string) => {
    if (
      (processingTime >= 60 && depositStatus === "pending") ||
      depositStatus === "failed"
    ) {
      return pushRoute("/loggedin/myaccount/deposit-failed");
    }

    if (depositStatus === "pending") {
      setProcessingTime(prevTime => prevTime + 3);
      return checkDepositStatus(id);
    }

    if (depositStatus === "complete") {
      pushRoute("/loggedin/myaccount/deposit-done");
    }
  };

  useEffect(() => {
    tick(depositStatus);
  }, []);

  useInterval(() => {
    tick(depositStatus);
  }, 3000);
}

export { useDepositProcess };
