import api from "../../core/api";
import { SuspendReason } from "app/types";
import { FormikHelpers } from "formik";
import { fetchAccountStatus } from "../../modules/account-status";
import { closeDialog } from "../";
import { updatePlayerList } from "../../modules/sidebar";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";

interface Props {
  playerId: number;
  reasons: SuspendReason[];
  note: string;
  accountClosed: boolean;
  formikActions: FormikHelpers<FormValues>;
}

export const proceed = ({ playerId, reasons, note, accountClosed, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.suspendAccount(playerId, reasons, note, accountClosed);
    dispatch(fetchAccountStatus(playerId));
    dispatch(updatePlayerList());
    dispatch(closeDialog("account-suspend"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
