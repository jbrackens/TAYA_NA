import { createSelector } from "reselect";
import { LobbyState } from "../lobby";

export const getRealityCheck = (state: LobbyState) =>
  state.dialogs.realityCheck;

export const getRealityCheckStatus = createSelector(
  [getRealityCheck],
  realityCheck => realityCheck.isOpen
);

export const getTermsConditions = (state: LobbyState) =>
  state.dialogs.termsConditions;
