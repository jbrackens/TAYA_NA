import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { CountrySettings } from "@idefix-backoffice/idefix/types";
import { EditCountryForm, editCountryValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useEditCountry } from "./hooks";

interface Props {
  payload: CountrySettings;
  meta?: unknown;
}

const EditCountryDialog: FC<Props> = ({ payload: country }) => {
  const { handleSave, handleClose, initialValues } = useEditCountry(country);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validationSchema={editCountryValidationSchema}>
        {props => (
          <>
            <DialogTitle>Country</DialogTitle>
            <DialogContent>
              <EditCountryForm />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                type="submit"
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

export { EditCountryDialog };
