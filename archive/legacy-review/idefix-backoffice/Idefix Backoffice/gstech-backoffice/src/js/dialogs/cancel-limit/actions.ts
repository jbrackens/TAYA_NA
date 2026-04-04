import { ActiveLimit, CancelLimitValues } from "app/types";
import { FormikHelpers } from "formik";
import api from "../../core/api";
import { fetchActiveLimits, fetchHistory } from "../../modules/limits";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";

interface Payload {
  limit: ActiveLimit;
  delay: boolean;
  playerId: number;
}

export const confirmCancelLimit =
  (payload: Payload, reason: string, formActions: FormikHelpers<CancelLimitValues>) =>
  async (dispatch: AppDispatch) => {
    const { limit, delay, playerId } = payload;
    try {
      await api.players.cancelLimit(limit, delay, reason);
      dispatch(fetchActiveLimits(playerId));
      dispatch(fetchHistory(playerId));
      dispatch(closeDialog("cancel-limit"));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
