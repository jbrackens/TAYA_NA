import profileSlice from "./lib/slices/profileSlice";
import authSlice from "./lib/slices/authSlice";
import settingsSlice from "./lib/slices/settingsSlice";
import betSlice from "./lib/slices/betSlice";
import navigationSlice from "./lib/slices/navigationSlice";
import sportSlice from "./lib/slices/sportSlice";
import cashierSlice from "./lib/slices/cashierSlice";
import { channelReducer } from "./lib/slices/channels/channelsReducer";
import marketSlice from "./lib/slices/marketSlice";
import fixtureSlice from "./lib/slices/fixtureSlice";
import siteSettingsSlice from "./lib/slices/siteSettingsSlice";
import predictionSlice from "./lib/slices/predictionSlice";

export const reducer = {
  ...channelReducer,
  auth: authSlice,
  profile: profileSlice,
  settings: settingsSlice,
  bets: betSlice,
  markets: marketSlice,
  fixtures: fixtureSlice,
  navigation: navigationSlice,
  sports: sportSlice,
  cashier: cashierSlice,
  siteSettings: siteSettingsSlice,
  prediction: predictionSlice,
};

export const middleware = [];

export const enhancers = [];
