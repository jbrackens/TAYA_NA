import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
  Id,
} from "@phoenix-ui/utils";
import React from "react";
import { API_MARKET_LIFECYCLE_URL } from "../constants";
import LifecycleCancel from "../../../lifecycle/cancel";
import { canCancel } from "./utils";

export type MarketLifecycleCancelProps = {
  key: string;
  id: Id;
  lifecycle: MarketLifecycleType;
  label: string;
  onComplete: Function;
};

const MarketLifecycleCancel = ({
  id,
  lifecycle,
  label,
  onComplete,
}: MarketLifecycleCancelProps) => (
  <LifecycleCancel
    id={id}
    url={API_MARKET_LIFECYCLE_URL}
    visible={lifecycle !== MarketLifecycleTypeEnum.CANCELLED}
    disabled={!canCancel(lifecycle)}
    label={label}
    onComplete={onComplete}
  />
);

export default MarketLifecycleCancel;
