import { PunterStatus, PunterStatusEnum } from "@phoenix-ui/utils";

const SUSPEND_ACTION_DISALLOWED: PunterStatus[] = [PunterStatusEnum.PENDING];

export const canSuspend = (status: PunterStatus): boolean =>
  !SUSPEND_ACTION_DISALLOWED.includes(status);
