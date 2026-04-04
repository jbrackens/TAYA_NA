import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { GameManufacturer, GameProfile } from "@idefix-backoffice/idefix/types";

import { GameForm, gameValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useCreateGame } from "./hooks";

interface Props {
  payload: unknown;
  meta: {
    manufacturers: GameManufacturer[];
    gameProfiles: { brandId: string; brandName: string; availableProfiles: GameProfile[] }[];
  };
}
const AddGameDialog: FC<Props> = ({ meta }) => {
  const manufacturers = meta?.manufacturers || [];
  const gameProfiles = meta?.gameProfiles || [];
  const { handleSave, handleClose, initialValues } = useCreateGame({ manufacturers, gameProfiles });

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSave} validate={gameValidationSchema}>
        {props => (
          <>
            <DialogTitle>Game</DialogTitle>
            {meta && (
              <DialogContent>
                <GameForm manufacturers={manufacturers || []} gameProfiles={gameProfiles || []} />
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
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

export { AddGameDialog };
