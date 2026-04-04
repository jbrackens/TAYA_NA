import { closeDialog } from "../";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";

interface Props {
  payload: {
    callback: (reason: string) => void;
  };
  reason: string;
  formActions: FormikHelpers<FormValues>;
}

export const accountStatus = ({ payload, reason, formActions }: Props) => async (dispatch: AppDispatch) => {
  const { callback } = payload;

  try {
    await callback(reason);
    dispatch(closeDialog("account-status"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
