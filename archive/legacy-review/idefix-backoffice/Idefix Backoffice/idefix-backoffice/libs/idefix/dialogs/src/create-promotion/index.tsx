import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useAppSelector } from "@idefix-backoffice/idefix/store";

import { PromotionForm, promotionValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useCreatePromotion } from "./hooks";

export interface FormValues {
  name: string;
  multiplier: string | number;
  autoStart: boolean;
  allGames: boolean;
  calculateRounds: boolean;
  calculateWins: boolean;
  calculateWinsRatio: boolean;
  minimumContribution: string | number;
  games: number[];
  active: boolean;
}

interface Props {
  payload: {
    brandId: string;
  };
  meta?: unknown;
}

const CreatePromotionDialog: FC<Props> = ({ payload }) => {
  const gameList = useAppSelector(state => state.settings.games);
  const { handleSave, handleClose, initialValues } = useCreatePromotion(payload.brandId);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSave}
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

export { CreatePromotionDialog };
