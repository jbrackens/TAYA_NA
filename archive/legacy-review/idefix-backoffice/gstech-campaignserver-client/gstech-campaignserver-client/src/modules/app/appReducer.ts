import { combineReducers } from "@reduxjs/toolkit";

import brandSettings from "./brandSettingsSlice";
import settings from "./settingsSlice";

export const reducer = combineReducers({
  brandSettings,
  settings
});
