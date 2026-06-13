import { Button as ButtonEnum, Method, useSpy, Id } from "@phoenix-ui/utils";
import React, { useState } from "react";
import { useApi } from "../../../services/api/api-service";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";

export type LifecycleCancelProps = {
  id: Id;
  url: string;
  visible: boolean;
  disabled: boolean;
  label: string;
  onComplete: Function;
};

const LifecycleCancel = ({
  id,
  url,
  visible,
  disabled,
  label,
  onComplete,
}: LifecycleCancelProps) => {
  const [submitChange, setSubmitChange] = useState(false);
  const { spy } = useSpy();

  const [triggerApi, loading] = useApi(url, Method.POST);

  const handleClick = () => setSubmitChange(true);

  spy(submitChange, async ({ values }) => {
    if (values) {
      try {
        await triggerApi(null, {
          id,
          action: "cancel",
        });
        onComplete();
      } catch (err) {
        console.error({ err });
      }
      setSubmitChange(false);
    }
  });

  if (visible) {
    return (
      <Button
        shape={ButtonEnum.Shape.ROUND}
        icon={<CloseOutlined />}
        danger={true}
        disabled={disabled}
        type={ButtonEnum.Type.PRIMARY}
        loading={loading}
        onClick={handleClick}
      >
        {label}
      </Button>
    );
  }
  return null;
};

export default LifecycleCancel;
