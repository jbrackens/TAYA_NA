import { setCurrentBalance } from "../../../lib/slices/cashierSlice";

export enum WalletsChannelTypeEnum {
  UPDATE = "update",
}

export const WalletsChannelHandler = (data: any, dispatch: any) => {
  switch (data.event) {
    case WalletsChannelTypeEnum.UPDATE:
      dispatch(setCurrentBalance(data.data?.balance?.realMoney?.value?.amount));
      break;
  }
};
