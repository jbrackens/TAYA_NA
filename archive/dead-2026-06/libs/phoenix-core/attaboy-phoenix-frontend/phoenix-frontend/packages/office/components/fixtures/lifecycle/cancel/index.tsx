import { FixtureStatus, FixtureStatusEnum, Id } from "@phoenix-ui/utils";
import React from "react";
import { API_FIXTURE_LIFECYCLE_URL } from "../constants";
import LifecycleCancel from "../../../lifecycle/cancel";
import { canCancel } from "./utils";

export type FixtureLifecycleCancelProps = {
  key: string;
  id: Id;
  status: FixtureStatus;
  label: string;
  onComplete: Function;
};

const FixtureLifecycleCancel = ({
  id,
  status,
  label,
  onComplete,
}: FixtureLifecycleCancelProps) => (
  <LifecycleCancel
    id={id}
    url={API_FIXTURE_LIFECYCLE_URL}
    visible={status !== FixtureStatusEnum.GAME_ABANDONED}
    disabled={!canCancel(status)}
    label={label}
    onComplete={onComplete}
  />
);

export default FixtureLifecycleCancel;
