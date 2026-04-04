import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { GameManufacturer, GameProfileSetting, GameSettings } from "@idefix-backoffice/idefix/types";
import { GameForm, gameValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useEditGame } from "./hooks";

interface Props {
  payload: GameSettings;
  meta: {
    manufacturers: GameManufacturer[];
    gameProfiles: GameProfileSetting[];
  } | null;
}

const EditGameDialog: FC<Props> = ({ payload: game, meta }) => {
  const { handleSave, handleClose, initialValues } = useEditGame({
    game,
    gameProfiles: meta?.gameProfiles
  });

  return (
    <Dialog open={true && !!meta} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validate={gameValidationSchema}>
        {props => (
          <>
            <DialogTitle>Game</DialogTitle>
            {meta && (
              <DialogContent>
                <GameForm manufacturers={meta.manufacturers || []} gameProfiles={meta.gameProfiles || []} />
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

export { EditGameDialog };
