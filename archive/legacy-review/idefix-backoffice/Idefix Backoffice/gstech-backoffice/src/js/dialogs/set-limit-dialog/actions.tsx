import api from "../../core/api";
import { closeDialog } from "../";
import { fetchActiveLimits, fetchHistory } from "../../modules/limits";
import { LimitType, PeriodType } from "app/types";
import { FormikHelpers } from "formik";
import { AppDispatch } from "index";

export const setLimit = (
  playerId: number,
  type: LimitType,
  values: {
    period: PeriodType;
    reason: string;
    duration?: number | "indefinite" | undefined;
    limit?: number | undefined;
    isInternal?: boolean | undefined;
  },
  formikActions: FormikHelpers<any>,
) => async (dispatch: AppDispatch) => {
  try {
    await api.players.setLimit(playerId, type, values);
    dispatch(fetchActiveLimits(playerId));
    dispatch(fetchHistory(playerId));
    dispatch(closeDialog("set-limit"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
