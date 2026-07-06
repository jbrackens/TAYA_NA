import { PunterStatus, PunterStatusEnum, Id } from "@taptrade-ui/utils";
import { useState } from "react";
import { ToggleLabels } from "../../../../types/utils";
import { API_USERS_LIFECYCLE_URL } from "../constants";
import LifecycleSuspend, {
  LifecycleSuspendActions,
} from "../../../lifecycle/suspend";
import { canSuspend } from "./utils";

export type UserLifecycleSuspendProps = {
  key: string;
  id: Id;
  status: PunterStatus;
  labels: ToggleLabels;
  onComplete: Function;
};

const userLifecycleSuspendActions: LifecycleSuspendActions = {
  suspend: "suspend",
  unsuspend: "unsuspend",
};

const UserLifecycleSuspend = ({
  id,
  status,
  labels,
  onComplete,
}: UserLifecycleSuspendProps) => {
  // to handle be delay
  const [fakeLoading, setFakeLoading] = useState(false);

  const onCompleteFunc = () => {
    setFakeLoading(true);
    setTimeout(() => {
      setFakeLoading(false);
      onComplete();
    }, 3000);
  };

  const onFailFunc = () => setFakeLoading(false);

  return (
    <LifecycleSuspend
      id={id}
      url={API_USERS_LIFECYCLE_URL}
      active={status === PunterStatusEnum.SUSPENDED}
      open={canSuspend(status)}
      labels={labels}
      actions={userLifecycleSuspendActions}
      onComplete={onCompleteFunc}
      fakeLoading={fakeLoading}
      onFail={onFailFunc}
    />
  );
};

export default UserLifecycleSuspend;
