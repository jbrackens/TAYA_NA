import api from "../../core/api";
import { closeDialog } from "../";
import { fetchActiveLimits, fetchHistory } from "../../modules/limits";
import { PeriodType } from "app/types";
import { FormikHelpers } from "formik";
import { AppDispatch } from "index";

export const raiseLimit = (
  playerId: number,
  limitId: number,
  values: {
    reason: string;
    period: PeriodType;
    limit: number;
  },
  formikActions: FormikHelpers<any>,
) => async (dispatch: AppDispatch) => {
  try {
    await api.players.raiseLimit(playerId, limitId, values);
    dispatch(fetchActiveLimits(playerId));
    dispatch(fetchHistory(playerId));
    dispatch(closeDialog("raise-limit"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
