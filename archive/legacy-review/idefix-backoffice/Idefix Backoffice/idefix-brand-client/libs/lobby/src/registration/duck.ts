import { Reducer } from "redux";
import { ActionCreator } from "redux";
import { LobbyState } from "../lobby";
import {
  RegistrationActions,
  RegistrationTypes,
  RegistrationState
} from "./types";

export type ToggleRegistrationAction = {
  type: RegistrationTypes.TOGGLE;
};

export const toggleRegistration: ActionCreator<ToggleRegistrationAction> = () => ({
  type: RegistrationTypes.TOGGLE
});

const registrationReducer: Reducer<RegistrationState, RegistrationActions> = (
  state = false,
  action
) => {
  switch (action.type) {
    case RegistrationTypes.TOGGLE:
      return !state;

    default:
      return state;
  }
};

export const getRegistrationStatus = (state: LobbyState) =>
  state.registrationIsOpen;

export { registrationReducer };
