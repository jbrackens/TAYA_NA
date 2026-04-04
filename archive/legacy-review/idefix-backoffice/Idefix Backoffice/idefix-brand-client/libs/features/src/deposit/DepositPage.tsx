import * as React from "react";
import { useRegistry } from "@brandserver-client/ui";
import { Deposit } from "@brandserver-client/types";
import { MyAccountPage } from "@brandserver-client/lobby";
import { withInitialProps } from "../with-initial-props";
import { DepositView } from "./components/DepositView";
import { DepositProvider } from "./context";

interface IProps {
  isLoading: boolean;
  data: Deposit | undefined;
  onSetData: React.Dispatch<React.SetStateAction<Deposit | undefined>>;
}

const DepositPage: MyAccountPage<IProps, Deposit> = ({
  data,
  isLoading,
  onSetData
}) => {
  const { Loader } = useRegistry();

  if (!data || isLoading || data.depositMethods.length === 0) {
    return <Loader />;
  }
  return (
    <DepositProvider deposit={data} onSetData={onSetData}>
      <DepositView />;
    </DepositProvider>
  );
};

DepositPage.fetchInitialProps = async ({ lobby }) => {
  const deposit = await lobby.api.deposit.getDeposit();
  return deposit;
};

export default withInitialProps<Deposit>(DepositPage);
