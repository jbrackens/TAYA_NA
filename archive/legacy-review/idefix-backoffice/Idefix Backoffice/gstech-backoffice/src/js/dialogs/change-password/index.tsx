import { ChangePasswordValues } from "app/types";
import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { ChangePasswordForm, validationSchema } from "../../forms/change-password";
import { change } from "./actions";

const initialValues = {
  email: "",
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

interface Props {
  payload: string;
  meta?: unknown;
}

const ChangePassword: FC<Props> = ({ payload: email }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: ChangePasswordValues, formActions: FormikHelpers<ChangePasswordValues>) => {
      dispatch(change(email, pick(["oldPassword", "newPassword", "confirmPassword"], values), formActions));
    },
    [dispatch, email],
  );

  return (
    <Dialog open={true} transitionDuration={0}>
      <Formik initialValues={{ ...initialValues, email }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Change password</DialogTitle>
            <DialogContent>
              <ChangePasswordForm />
            </DialogContent>
            <DialogActions>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Change
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ChangePassword;
