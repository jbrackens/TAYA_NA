import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { GameProfileForm, gameProfileValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useCreateGameProfile } from "./hooks";

interface Props {
  payload: {
    brandId: string;
  };
  meta?: unknown;
}

const CreateGameProfileDialog: FC<Props> = ({ payload }) => {
  const { handleSave, handleClose, initialValues } = useCreateGameProfile(payload.brandId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validationSchema={gameProfileValidationSchema}>
        {props => (
          <>
            <DialogTitle>Game profile</DialogTitle>
            <DialogContent>
              <GameProfileForm />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                color="primary"
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { CreateGameProfileDialog };
