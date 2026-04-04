import api from "../../core/api";
import { fetchPlayerLedgers, fetchPlayerLedgersError } from "../../modules/rewards";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormValues } from "./index";
import { FormikHelpers } from "formik";

interface Props {
  playerId: number;
  groupId: number;
  values: FormValues;
  formikActions: FormikHelpers<FormValues>;
}

export const confirmMarkAsUsed = ({ playerId, groupId, values, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.markRewardUsed(playerId, groupId, values);
    dispatch(fetchPlayerLedgers({ playerId }));
    dispatch(closeDialog("confirm-mark-as-used"));
  } catch (error) {
    fetchPlayerLedgersError(error.message);
    formikActions.setFieldError("general", error.message);
  }
};
