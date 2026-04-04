import api from "../../core/api";
import { closeDialog } from "../";
import { GamblingProblemData } from "app/types";
import { FormikHelpers } from "formik";
import { AppDispatch } from "index";

export const registerGamblingProblem = (data: GamblingProblemData, formikActions: FormikHelpers<any>) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.players.createGamblingProblem(data);
    dispatch(closeDialog("register-gambling-problem"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
    formikActions.setSubmitting(false);
  }
};
