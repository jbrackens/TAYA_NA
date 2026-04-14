import { Dispatch } from "redux";
import { ParsedData } from "../websocket-service";
import { setCurrentBalance } from "../../../lib/slices/cashierSlice";

export enum WalletsChannelTypeEnum {
  UPDATE = "update",
}

export const WalletsChannelHandler = (data: ParsedData, dispatch: Dispatch) => {
  switch (data.event) {
    case WalletsChannelTypeEnum.UPDATE: {
      const balance = data.data?.balance as Record<string, unknown> | undefined;
      const realMoney = balance?.realMoney as Record<string, unknown> | undefined;
      const value = realMoney?.value as Record<string, unknown> | undefined;
      dispatch(setCurrentBalance(value?.amount as number));
      break;
    }
  }
};
