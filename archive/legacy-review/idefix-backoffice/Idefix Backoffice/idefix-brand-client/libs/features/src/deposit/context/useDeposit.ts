import { useContext } from "react";
import { DepositContext } from "./DepositContext";

function useDeposit() {
  const context = useContext(DepositContext);

  if (context === undefined) {
    throw new Error("useDeposit must be used within a DepositProvider");
  }

  return context;
}

export { useDeposit };
