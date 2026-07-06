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

export const handleBetUpdate = (payload: any, dispatch: any) => {
  switch (payload.state) {
    case BetChannelStateTypeEnum.OPENED:
      dispatch(wsBetUpdateOpened(payload));
      break;
    case BetChannelStateTypeEnum.CANCELLED:
      dispatch(wsBetUpdateCancelled(payload));
      break;
    case BetChannelStateTypeEnum.SETTLED:
      dispatch(wsBetUpdateSettled(payload));
      break;
    case BetChannelStateTypeEnum.FAILED:
      dispatch(wsBetUpdateFailed(payload));
      break;
  }
};
