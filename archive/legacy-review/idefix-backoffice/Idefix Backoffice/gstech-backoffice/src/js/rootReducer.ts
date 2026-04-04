import { combineReducers } from "@reduxjs/toolkit";
import { reducer as data } from "./modules/../core/data";
import { reducer as accountStatus } from "./modules/account-status";
import { reducer as authentication } from "./modules/authentication";
import { reducer as fraudTask } from "./modules/fraud-task";
import { reducer as historyAndNotes } from "./modules/history-and-notes";
import { reducer as limits } from "./modules/limits";
import { reducer as kycProcess } from "./modules/kyc-process";
import { reducer as payments } from "./modules/payments";
import { reducer as player } from "./modules/player";
import { reducer as playerDetails } from "./modules/player-details";
import { reducer as playerInfo } from "./modules/player-info";
import { reducer as reports } from "./modules/reports";
import { reducer as settings } from "./modules/settings";
import { reducer as userInfo } from "./modules/user-info";
import { reducer as usersSidebar } from "./modules/users-sidebar";
import { reducer as tags } from "./modules/tags";
import { reducer as transactions } from "./modules/transactions";
import { reducer as withdrawalTask } from "./modules/withdrawal-task";
import { reducer as bonuses } from "./modules/bonuses";
import { reducer as app } from "./modules/app";
import { reducer as dialogs } from "./dialogs";
import { reducer as promotions } from "./modules/promotions";
import { reducer as confirmationDialog } from "./core/components/confirmation-dialog";
import { reducer as documents } from "./modules/documents";
import { reducer as questionnaires } from "./modules/questionnaires";
import { reducer as sidebar } from "./modules/sidebar";
import { reducer as risks } from "./modules/risks";
import { reducer as playerConnection } from "./modules/add-player-connection";
import { reducer as playerRewards } from "./modules/rewards";
import { reducer as campaignsTab } from "./modules/campaigns-tab";

const rootReducer = combineReducers({
  app,
  authentication,
  data,
  accountStatus,
  fraudTask,
  historyAndNotes,
  limits,
  kycProcess,
  payments,
  player,
  playerInfo,
  playerDetails,
  reports,
  settings,
  userInfo,
  usersSidebar,
  tags,
  transactions,
  withdrawalTask,
  bonuses,
  promotions,
  documents,
  questionnaires,
  sidebar,
  risks,
  playerConnection,
  playerRewards,
  campaignsTab,

  dialogs,
  confirmationDialog,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
