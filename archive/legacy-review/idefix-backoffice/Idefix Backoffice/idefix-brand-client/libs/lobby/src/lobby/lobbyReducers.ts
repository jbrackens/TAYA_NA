import { appReducer as app } from "../app";
import { cmsReducer as cms } from "../cms";
import { reducer as dialogs } from "../dialogs";
import { errorDialogReducer as errorDialog } from "../error-dialog";
import { infoDialogReducer as infoDialog } from "../info-dialog";
import { game } from "../game";
import { gamesReducer as games } from "../games";
import { mobileMenuReducer as mobileMenuIsOpen } from "../mobile-menu";
import { updateReducer as update } from "../update";
import { loginReducer as login } from "../login";
import { registrationReducer as registrationIsOpen } from "../registration";
import { exclusionsReducer as exclusions } from "../exclusions";

export default {
  app,
  cms,
  dialogs,
  errorDialog,
  infoDialog,
  game,
  games,
  mobileMenuIsOpen,
  update,
  login,
  registrationIsOpen,
  exclusions
};
