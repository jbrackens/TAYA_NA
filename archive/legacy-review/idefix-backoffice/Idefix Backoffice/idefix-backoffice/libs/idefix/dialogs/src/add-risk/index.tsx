import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { RiskForm, riskValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useAddRisk } from "./hooks";

interface Props {
  payload: unknown;
  meta?: unknown;
}

const AddRiskDialog: FC<Props> = () => {
  const { handleSubmit, handleClose, initialValues } = useAddRisk();

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={riskValidationSchema}>
        {props => (
          <>
            <DialogTitle>Add Risk</DialogTitle>
            <DialogContent>
              <RiskForm />
            </DialogContent>
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
                Add
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { AddRiskDialog };
