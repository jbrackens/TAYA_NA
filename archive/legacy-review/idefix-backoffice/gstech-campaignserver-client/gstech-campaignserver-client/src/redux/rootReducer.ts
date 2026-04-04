import { combineReducers } from "@reduxjs/toolkit";

import { reducer as campaignsPage } from "../pages/Campaigns";
import { reducer as app } from "../modules/app";
import { reducer as campaignEmail } from "../modules/campaign-email";
import { reducer as emailPreview } from "../modules/campaign-email/EmailPreview";
import { reducer as smsPreview } from "../modules/campaign-sms/SmsPreview";
import { reducer as campaignSms } from "../modules/campaign-sms";
import { reducer as campaignNotification } from "../modules/campaign-notification";
import { reducer as notificationPreview } from "../modules/campaign-notification/NotificationPreview";
import { reducer as campaignBanner } from "../modules/campaign-banner";
import { reducer as rewards } from "../modules/rewards";
import { reducer as campaignReward } from "../modules/campaign-reward";
import { reducer as campaignInfo } from "../modules/campaign-info";
import { reducer as campaignAudience } from "../modules/campaign-audience";
import { reducer as rewardsPage } from "../pages/Rewards";
import { reducer as gamesPage } from "../pages/Games";
import { reducer as content } from "../modules/content";

const rootReducer = combineReducers({
  campaignsPage,
  campaignInfo,
  campaignEmail,
  emailPreview,
  smsPreview,
  campaignSms,
  campaignNotification,
  notificationPreview,
  campaignBanner,
  campaignAudience,
  campaignReward,
  rewards,
  rewardsPage,
  gamesPage,
  content,
  app
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
