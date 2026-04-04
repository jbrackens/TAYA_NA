import api from "../../core/api";
import { changePlayerTab } from "../../modules/sidebar";
import { closeDialog } from "../";
import { AppDispatch } from "index";

export const stealLock = (playerId: number, taskType: string) => (dispatch: AppDispatch) =>
  api.locks.steal(playerId).then(() => {
    dispatch(changePlayerTab(playerId, `tasks/${taskType}`, true));
    dispatch(closeDialog("steal-player"));
  });
