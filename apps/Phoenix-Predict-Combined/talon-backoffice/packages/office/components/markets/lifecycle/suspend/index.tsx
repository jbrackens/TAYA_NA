import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
  Id,
  Button as ButtonEnum,
  Method,
} from "@phoenix-ui/utils";
import React, { useEffect } from "react";
import { ToggleLabels } from "../../../../types/utils";
import { useApi } from "../../../../services/api/api-service";
import { Button } from "antd";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { canSuspend } from "./utils";

export type MarketLifecycleSuspendProps = {
  key: string;
  id: Id;
  lifecycle: MarketLifecycleType;
  labels: ToggleLabels;
  onComplete: Function;
};

/**
 * Market-specific suspend/reopen control using Go's PUT /admin/markets/:id/status.
 * Does NOT use the shared LifecycleSuspend POST component to avoid regressing
 * other domains that still rely on the legacy lifecycle/:action pattern.
 */
const MarketLifecycleSuspend = ({
  id,
  lifecycle,
  labels,
  onComplete,
}: MarketLifecycleSuspendProps) => {
  const isSuspended = lifecycle === MarketLifecycleTypeEnum.NOT_BETTABLE;
  const visible = canSuspend(lifecycle);

  const [triggerApi, loading, response] = useApi(
    "admin/markets/:id/status",
    Method.PUT,
  );

  useEffect(() => {
    if (response.succeeded) {
      onComplete();
    }
  }, [response.succeeded]);

  const handleClick = async () => {
    try {
      await triggerApi(
        {
          status: isSuspended ? "open" : "suspended",
          reason: isSuspended ? "operator_reopen" : "operator_suspend",
        },
        { id },
      );
    } catch (err) {
      console.error({ err });
    }
  };

  if (!visible) return null;

  return (
    <Button
      shape={ButtonEnum.Shape.ROUND}
      icon={isSuspended ? <LockOutlined /> : <UnlockOutlined />}
      danger={isSuspended}
      type={isSuspended ? ButtonEnum.Type.PRIMARY : ButtonEnum.Type.DASHED}
      loading={loading}
      onClick={handleClick}
    >
      {isSuspended ? labels.active : labels.inactive}
    </Button>
  );
};

export default MarketLifecycleSuspend;
