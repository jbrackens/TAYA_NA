import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { playerSlice, appSlice, useAppSelector } from "@idefix-backoffice/idefix/store";
import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { RegisterGamblingForm, registerGamblingValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useRegisterGambling } from "./hooks";

interface Props {
  payload: unknown;
  meta?: unknown;
}

const RegisterGamblingProblemDialog: FC<Props> = () => {
  const { handleSubmit, handleClose, initialValues } = useRegisterGambling();
  const { brandId } = useAppSelector(playerSlice.getPlayerInfo) as PlayerWithUpdate;
  const brandSettings = useAppSelector(state => appSlice.getBrandSettings(state, brandId));
  const countries = brandSettings?.countries;

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleClose}>
      <Formik onSubmit={handleSubmit} validationSchema={registerGamblingValidationSchema} initialValues={initialValues}>
        {formikProps => (
          <>
            <DialogTitle>Create Gambling Problem</DialogTitle>
            <DialogContent>
              <RegisterGamblingForm countries={countries} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={formikProps.submitForm}
                disabled={!formikProps.isValid || formikProps.isSubmitting || !formikProps.dirty}
                color="primary"
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

export { RegisterGamblingProblemDialog };
