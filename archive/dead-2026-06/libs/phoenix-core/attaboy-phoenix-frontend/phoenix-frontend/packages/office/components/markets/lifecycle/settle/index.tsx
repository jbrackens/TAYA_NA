import {
  MarketLifecycleType,
  Button as ButtonEnum,
  Method,
  useSpy,
  Id,
  SelectionOdd,
} from "@phoenix-ui/utils";
import React, { useState, useEffect } from "react";
import { useApi } from "../../../../services/api/api-service";
import { Button } from "antd";
import { GoldOutlined } from "@ant-design/icons";
import { API_MARKET_LIFECYCLE_URL } from "../constants";
import { canSettle, canReSettle } from "./utils";
import MarketLifecycleSettleModal, {
  MarketLifecycleSettlePayload,
} from "./modal";

export type MarketLifecycleSettleLabels = {
  settle: string;
  resettle: string;
};

export type LifecycleSuspendProps = {
  key: string;
  id: Id;
  selections: SelectionOdd[];
  lifecycle: MarketLifecycleType;
  labels: MarketLifecycleSettleLabels;
  onComplete: Function;
};

const MarketLifecycleSettle = ({
  id,
  selections,
  lifecycle,
  labels,
  onComplete,
}: LifecycleSuspendProps) => {
  const [submitData, setSubmitSelection] = useState<
    MarketLifecycleSettlePayload
  >();
  const [submitChange, setSubmitChange] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { spy } = useSpy();

  const [triggerApi, loading, response] = useApi(
    API_MARKET_LIFECYCLE_URL,
    Method.POST,
  );

  const handleClick = () => setIsModalVisible(true);

  const handleClose = () => setIsModalVisible(false);

  const handleSubmit = (payload: MarketLifecycleSettlePayload) => {
    setSubmitSelection(payload);
    setSubmitChange(true);
  };

  let action = "";
  if (canSettle(lifecycle)) {
    action = "settle";
  } else if (canReSettle(lifecycle)) {
    action = "resettle";
  }

  spy(submitChange, async ({ values }) => {
    if (values && action) {
      try {
        await triggerApi(submitData, {
          id,
          action,
        });
      } catch (err) {
        console.error({ err });
      }
      setIsModalVisible(false);
      setSubmitChange(false);
    }
  });

  useEffect(() => {
    if (!response.succeeded) return;
    setTimeout(() => {
      onComplete();
    }, 2000);
  }, [response.succeeded]);

  const ableToSettle = action === "settle";

  if (action) {
    return (
      <>
        <Button
          shape={ButtonEnum.Shape.ROUND}
          icon={<GoldOutlined />}
          type={ButtonEnum.Type.PRIMARY}
          loading={loading}
          onClick={handleClick}
        >
          {ableToSettle ? labels.settle : labels.resettle}
        </Button>
        <MarketLifecycleSettleModal
          visible={isModalVisible}
          loading={loading}
          data={selections}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      </>
    );
  }
  return null;
};

export default MarketLifecycleSettle;
