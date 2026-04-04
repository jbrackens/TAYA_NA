import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Bonus, BonusLimit } from "@idefix-backoffice/idefix/types";
import { BonusForm, bonusValidationShcema } from "@idefix-backoffice/idefix/forms";

import { useBonus } from "./hooks";

interface Props {
  payload: { bonus: Bonus; brandId: string };
  meta: BonusLimit[];
}

const BonusDialog: FC<Props> = ({ payload, meta: bonusLimits }) => {
  const { handleUpdate, handleCreate, handleClose, initialValues } = useBonus({ ...payload, bonusLimits });

  return (
    <Dialog open={!!bonusLimits} transitionDuration={0} onClose={handleClose}>
      <Formik
        onSubmit={payload.bonus ? handleUpdate : handleCreate}
        validate={bonusValidationShcema}
        initialValues={initialValues}
      >
        {props => (
          <>
            <DialogTitle>Bonus</DialogTitle>
            {bonusLimits && (
              <DialogContent>
                <BonusForm bonusLimits={bonusLimits} values={props.values} />
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

export { BonusDialog };
