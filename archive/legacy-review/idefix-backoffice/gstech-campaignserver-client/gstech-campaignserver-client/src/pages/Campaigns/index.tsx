import { combineReducers } from "@reduxjs/toolkit";
import { reducer as campaigns } from "./campaignsSlice";
import { reducer as visibilityFilter } from "./visibilityFilterSlice";
export { CampaignsPage as default } from "./CampaignsPage";
export * from "./CampaignDetails";
export * from "./NewCampaign";

export const reducer = combineReducers({
  campaigns,
  visibilityFilter
});
