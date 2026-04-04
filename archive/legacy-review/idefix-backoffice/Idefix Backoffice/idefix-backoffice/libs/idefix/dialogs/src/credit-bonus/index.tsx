import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { CreditBonusForm, creditBonusValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useCreditBonus } from "./hooks";

interface Props {
  payload: number;
  meta: { id: string; title: string }[];
}

const CreditBonusDialog: FC<Props> = ({ payload: playerId, meta: bonuses = [] }) => {
  const { handleCredit, handleClose, initialValues } = useCreditBonus(playerId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleCredit} validationSchema={creditBonusValidationSchema} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Credit bonus</DialogTitle>
            <DialogContent>{bonuses && <CreditBonusForm bonuses={bonuses} formikProps={props} />}</DialogContent>
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

export { CreditBonusDialog };
