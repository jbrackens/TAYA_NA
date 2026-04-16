import { Dispatch } from "redux";
import { BetReason } from "@phoenix-ui/utils";
import {
  wsBetUpdateCancelled,
  wsBetUpdateFailed,
  wsBetUpdateOpened,
  wsBetUpdateSettled,
} from "../../../lib/slices/betSlice";

export enum BetChannelStateTypeEnum {
  OPENED = "OPENED",
  CANCELLED = "CANCELLED",
  SETTLED = "SETTLED",
  FAILED = "FAILED",
}

interface BetUpdatePayload {
  betId: string;
  state: string;
  reason?: BetReason;
}

export const handleBetUpdate = (payload: Record<string, unknown>, dispatch: Dispatch) => {
  const betPayload = payload as unknown as BetUpdatePayload;
  switch (betPayload.state) {
    case BetChannelStateTypeEnum.OPENED:
      dispatch(wsBetUpdateOpened(betPayload));
      break;
    case BetChannelStateTypeEnum.CANCELLED:
      dispatch(wsBetUpdateCancelled(betPayload));
      break;
    case BetChannelStateTypeEnum.SETTLED:
      dispatch(wsBetUpdateSettled(betPayload));
      break;
    case BetChannelStateTypeEnum.FAILED:
      dispatch(wsBetUpdateFailed(betPayload));
      break;
  }
};
