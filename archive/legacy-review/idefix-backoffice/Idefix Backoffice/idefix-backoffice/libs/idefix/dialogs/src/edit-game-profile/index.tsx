import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { GameProfile } from "@idefix-backoffice/idefix/types";
import { GameProfileForm, gameProfileValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useEditGameProfile } from "./hooks";

interface Props {
  payload: {
    brandId: string;
    gameProfile: GameProfile;
  };
  meta?: unknown;
}

const EditGameProfileDialog: FC<Props> = ({ payload }) => {
  const { handleSave, handleClose, initialValues } = useEditGameProfile(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSave} validationSchema={gameProfileValidationSchema}>
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

export { EditGameProfileDialog };
