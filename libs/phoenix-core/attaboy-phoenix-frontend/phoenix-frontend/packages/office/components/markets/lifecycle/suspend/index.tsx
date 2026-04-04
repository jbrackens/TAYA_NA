import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
  Id,
} from "@phoenix-ui/utils";
import React from "react";
import { ToggleLabels } from "../../../../types/utils";
import { API_MARKET_LIFECYCLE_URL } from "../constants";
import LifecycleSuspend from "../../../lifecycle/suspend";
import { canSuspend } from "./utils";

export type MarketLifecycleSuspendProps = {
  key: string;
  id: Id;
  lifecycle: MarketLifecycleType;
  labels: ToggleLabels;
  onComplete: Function;
};

const MarketLifecycleSuspend = ({
  id,
  lifecycle,
  labels,
  onComplete,
}: MarketLifecycleSuspendProps) => (
  <LifecycleSuspend
    id={id}
    url={API_MARKET_LIFECYCLE_URL}
    active={lifecycle === MarketLifecycleTypeEnum.NOT_BETTABLE}
    visible={canSuspend(lifecycle)}
    labels={labels}
    onComplete={onComplete}
  />
);

export default MarketLifecycleSuspend;
