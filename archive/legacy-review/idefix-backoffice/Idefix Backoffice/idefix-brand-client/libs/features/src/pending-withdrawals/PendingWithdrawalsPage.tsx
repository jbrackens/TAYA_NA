import * as React from "react";
import { PendingWithdraw } from "@brandserver-client/types";
import { MyAccountPage } from "@brandserver-client/lobby";
import { ApiContext } from "@brandserver-client/api";
import { useRegistry } from "@brandserver-client/ui";
import { withInitialProps } from "../with-initial-props";
import PendingWithdrawals from "./PendingWithdrawals";

interface IProps {
  data: PendingWithdraw[] | undefined;
  isLoading: boolean;
  onSetData: React.Dispatch<
    React.SetStateAction<PendingWithdraw[] | undefined>
  >;
}

const WithdrawPendingPage: MyAccountPage<IProps, PendingWithdraw[]> = ({
  data,
  isLoading,
  onSetData
}) => {
  const api = React.useContext(ApiContext);

  const { Loader } = useRegistry();

  const handleRemovePendingWithdraw = React.useCallback(
    async (id: string) => {
      try {
        const newPendingWithdrawals =
          await api.pendingWithdraw.removePendingWithdraw(id);
        onSetData(newPendingWithdrawals);
      } catch (error) {
        console.log(error, "error");
      }
    },
    [api]
  );

  if (isLoading || !data) {
    return <Loader />;
  }

  return (
    <PendingWithdrawals
      withdrawals={data}
      onRemovePendingWithdraw={handleRemovePendingWithdraw}
    />
  );
};

WithdrawPendingPage.fetchInitialProps = async ({ lobby: { api } }) => {
  const withdrawals = await api.pendingWithdraw.getPendingWithdraw();
  return withdrawals;
};

export default withInitialProps(WithdrawPendingPage);
