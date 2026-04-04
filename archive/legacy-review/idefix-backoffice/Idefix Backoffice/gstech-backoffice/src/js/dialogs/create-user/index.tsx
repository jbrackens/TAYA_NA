import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { closeDialog } from "../";
import { createUser } from "./actions";
import { CreateUserForm, validationSchema } from "../../forms/create-user";

export interface FormValues {
  name: string;
  handle: string;
  email: string;
  mobilePhone: string;
}

interface Props {
  payload: unknown;
  meta?: unknown;
}

const CreateUserDialog: FC<Props> = () => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(createUser(values, formikActions));
    },
    [dispatch],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("create-user")), [dispatch]);

  const initialValues = useMemo(
    () => ({
      name: "",
      handle: "",
      email: "",
      mobilePhone: "",
    }),
    [],
  );

  return (
    <Dialog open={true} onClose={handleClose} transitionDuration={0}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Create user</DialogTitle>
            <DialogContent>
              <CreateUserForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                onClick={props.submitForm}
              >
                Create
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default CreateUserDialog;
