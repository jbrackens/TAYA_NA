import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { CountrySettings, GameManufacturer } from "@idefix-backoffice/idefix/types";

import { EditGameManufacturerForm } from "@idefix-backoffice/idefix/forms";
import { useEditManuficturer } from "./hooks";

interface Props {
  payload: string;
  meta: {
    manufacturer?: GameManufacturer & { blockedCountries: any[] };
    countries?: CountrySettings[];
  };
}

const EditGameManufacturerDialog: FC<Props> = ({ payload: gameManufacturerId, meta }) => {
  const countries = meta?.countries;
  const { handleSave, handleClose, initialValues } = useEditManuficturer({ gameManufacturerId, ...meta });

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Game Manufacturer</DialogTitle>
            {countries && !!meta && (
              <DialogContent>
                <EditGameManufacturerForm countries={countries} {...props} />
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={props.isSubmitting || !props.dirty}
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

export { EditGameManufacturerDialog };
