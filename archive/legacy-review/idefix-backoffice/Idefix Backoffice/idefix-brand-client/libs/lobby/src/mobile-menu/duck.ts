import { ActionCreator } from "redux";
import { MobileMenuAction, MobileMenuTypes, MobileMenuState } from "./types";
import { Reducer } from "react";
import { LobbyState } from "../lobby";

export const toggleMobileMenu: ActionCreator<MobileMenuAction> = () => ({
  type: MobileMenuTypes.TOGGLE
});

const mobileMenuReducer: Reducer<MobileMenuState, MobileMenuAction> = (
  state = false,
  action
) => {
  switch (action.type) {
    case MobileMenuTypes.TOGGLE:
      return !state;
    default:
      return state;
  }
};

export const getMobileMenuStatus = (state: LobbyState) =>
  state.mobileMenuIsOpen;

export default mobileMenuReducer;
