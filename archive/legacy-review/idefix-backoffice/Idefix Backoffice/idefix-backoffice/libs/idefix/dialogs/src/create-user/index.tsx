import React, { FC } from "react";
import { Formik } from "formik";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { CreateUserForm, createUserValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useCreateUser } from "./hooks";

interface Props {
  payload: unknown;
  meta?: unknown;
}

const CreateUserDialog: FC<Props> = () => {
  const { handleSubmit, handleClose, initialValues } = useCreateUser();

  return (
    <Dialog open={true} onClose={handleClose} transitionDuration={0}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={createUserValidationSchema}>
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

export { CreateUserDialog };
