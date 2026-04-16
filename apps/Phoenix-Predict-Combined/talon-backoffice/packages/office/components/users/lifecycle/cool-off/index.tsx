import {
  PunterStatus,
  Button as ButtonEnum,
  Method,
  useSpy,
  Id,
} from "@phoenix-ui/utils";
import React, { useState } from "react";
import { useApi } from "../../../../services/api/api-service";
import { Button } from "antd";
import { FieldTimeOutlined } from "@ant-design/icons";
import { API_USERS_LIFECYCLE_URL } from "../constants";
import { canSetCoolOff, canResetCoolOff } from "./utils";
import { isNil } from "lodash";

export type UserLifecycleCoolOffLabels = {
  setCoolOff: string;
  resetCoolOff: string;
};

export type LifecycleCoolOffProps = {
  key: string;
  id: Id;
  status: PunterStatus;
  labels: UserLifecycleCoolOffLabels;
  onComplete: Function;
};

const UserLifecycleCoolOff = ({
  id,
  status,
  labels,
  onComplete,
}: LifecycleCoolOffProps) => {
  const [submitChange, setSubmitChange] = useState(false);
  const { spy } = useSpy();

  const [triggerApi, loading] = useApi(API_USERS_LIFECYCLE_URL, Method.PUT);

  const handleClick = () => setSubmitChange(true);

  let enable: boolean | null = null;
  if (canSetCoolOff(status)) {
    enable = true;
  } else if (canResetCoolOff(status)) {
    enable = false;
  }

  spy(submitChange, async ({ values }) => {
    if (values && !isNil(enable)) {
      try {
        await triggerApi(
          {
            enable,
            reason: "Operator action",
          },
          {
            id,
            action: "cool-off",
          },
        );
        onComplete();
      } catch (err) {
        console.error({ err });
      }
      setSubmitChange(false);
    }
  });

  if (!isNil(enable)) {
    return (
      <Button
        shape={ButtonEnum.Shape.ROUND}
        icon={<FieldTimeOutlined />}
        type={ButtonEnum.Type.PRIMARY}
        loading={loading}
        onClick={handleClick}
      >
        {enable ? labels.setCoolOff : labels.resetCoolOff}
      </Button>
    );
  }
  return null;
};

export default UserLifecycleCoolOff;
