import { PunterStatus, PunterStatusEnum } from "@phoenix-ui/utils";

const SET_TIMEOUT_STATUS_ACTION_ALLOWED: PunterStatus[] = [
  PunterStatusEnum.ACTIVE,
];
const RESET_TIMEOUT_STATUS_ACTION_ALLOWED: PunterStatus[] = [
  PunterStatusEnum.PENDING,
];

export const canSetCoolOff = (status: PunterStatus): boolean =>
  SET_TIMEOUT_STATUS_ACTION_ALLOWED.includes(status);

export const canResetCoolOff = (status: PunterStatus): boolean =>
  RESET_TIMEOUT_STATUS_ACTION_ALLOWED.includes(status);
