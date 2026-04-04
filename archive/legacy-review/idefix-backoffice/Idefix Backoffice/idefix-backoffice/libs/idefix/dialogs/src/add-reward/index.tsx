import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Reward } from "@idefix-backoffice/idefix/types";
import { AddRewardForm, addRewardValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useAddReward } from "./hooks";

interface Props {
  payload: {
    playerId: number;
    brandId: string;
    groupId: string;
    groupName: string;
  };
  meta: Reward[];
}

const AddRewardDialog: FC<Props> = ({ payload, meta: rewards }) => {
  const { handleSubmit, handleClose, initialValues, filteredRewards, isOneReward } = useAddReward(payload, rewards);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={addRewardValidationSchema}
        validateOnMount
        enableReinitialize
      >
        {props => (
          <>
            <DialogTitle>Add {payload.groupName}</DialogTitle>
            <DialogContent>
              <AddRewardForm rewards={filteredRewards} isOneReward={isOneReward} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting}
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

export { AddRewardDialog };
