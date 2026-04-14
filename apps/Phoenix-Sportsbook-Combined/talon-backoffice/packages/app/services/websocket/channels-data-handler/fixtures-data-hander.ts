import { Dispatch } from "redux";
import {
  addFixtureUpdate,
  removeFixtureUpdate,
  FixtureUpdate,
} from "../../../lib/slices/fixtureSlice";
import { MessageEventEnum, ParsedData } from "../websocket-service";

export enum FxitureChannelTypeEnum {
  UPDATE = "update",
}

export const fixturesChannelHandler = (data: ParsedData, dispatch: Dispatch) => {
  const payload = data.data;

  switch (data.event) {
    case MessageEventEnum.UNSUBSCRIBE_SUCCESS:
      dispatch(removeFixtureUpdate(data.channel.split("^")[2]));
      break;
    case FxitureChannelTypeEnum.UPDATE:
      dispatch(addFixtureUpdate(payload as FixtureUpdate));
      break;
  }
};
