import {
  addFixtureUpdate,
  removeFixtureUpdate,
} from "../../../lib/slices/fixtureSlice";
import { MessageEventEnum } from "../websocket-service";

export enum FxitureChannelTypeEnum {
  UPDATE = "update",
}

export const fixturesChannelHandler = (data: any, dispatch: any) => {
  const payload = data.data;

  switch (data.event) {
    case MessageEventEnum.UNSUBSCRIBE_SUCCESS:
      dispatch(removeFixtureUpdate(data.channel.split("^")[2]));
      break;
    case FxitureChannelTypeEnum.UPDATE:
      dispatch(addFixtureUpdate(payload));
      break;
  }
};
