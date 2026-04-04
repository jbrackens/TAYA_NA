import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useAppSelector } from "@idefix-backoffice/idefix/store";
import { Promotion } from "@idefix-backoffice/idefix/types";
import { PromotionForm, promotionValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useEditPromotion } from "./hooks";

interface Props {
  payload: {
    brandId: string;
    promotion: Promotion;
  };
  meta?: unknown;
}

const EditPromotionDialog: FC<Props> = ({ payload }) => {
  const gameList = useAppSelector(state => state.settings.games);
  const { handleSave, handleClose, initialValues } = useEditPromotion(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        onSubmit={handleSave}
        initialValues={initialValues}
        validationSchema={promotionValidationSchema}
        enableReinitialize={true}
      >
        {props => (
          <>
            <DialogTitle>Promotion</DialogTitle>
            <DialogContent>
              <PromotionForm gameList={gameList} formikProps={props} />
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
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { EditPromotionDialog };
