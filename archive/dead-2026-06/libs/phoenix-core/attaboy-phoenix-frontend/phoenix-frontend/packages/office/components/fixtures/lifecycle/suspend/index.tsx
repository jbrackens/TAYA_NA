import { FixtureStatus, FixtureStatusEnum, Id } from "@phoenix-ui/utils";
import React from "react";
import { ToggleLabels } from "../../../../types/utils";
import { API_FIXTURE_LIFECYCLE_URL } from "../constants";
import LifecycleSuspend from "../../../lifecycle/suspend";
import { canSuspend } from "./utils";

export type FixtureLifecycleSuspendProps = {
  key: string;
  id: Id;
  status: FixtureStatus;
  labels: ToggleLabels;
  onComplete: Function;
};

const FixtureLifecycleSuspend = ({
  id,
  status,
  labels,
  onComplete,
}: FixtureLifecycleSuspendProps) => (
  <LifecycleSuspend
    id={id}
    url={API_FIXTURE_LIFECYCLE_URL}
    active={status === FixtureStatusEnum.BREAK_IN_PLAY}
    visible={canSuspend(status)}
    labels={labels}
    onComplete={onComplete}
  />
);

export default FixtureLifecycleSuspend;
