import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { ActiveLimit, LimitType } from "@idefix-backoffice/idefix/types";
import { LimitForm } from "@idefix-backoffice/idefix/forms";

import { useRaiseLimit } from "./hooks";

interface Props {
  payload: { playerId: number; limit: ActiveLimit; type: LimitType };
  meta?: unknown;
}

const RaiseLimitDialog: FC<Props> = ({ payload }) => {
  const { handleRaiseLimit, handleClose, initialValues, type, error } = useRaiseLimit(payload);

  return (
    <Dialog open={true} onClose={handleClose} transitionDuration={0}>
      <Formik initialValues={initialValues} onSubmit={handleRaiseLimit}>
        {props => (
          <>
            <DialogTitle>{`Change ${type === "selfExclusion" ? "self exclusion" : `${type} limit`}`}</DialogTitle>
            <DialogContent>
              <LimitForm dialog="raise-limit" limitError={error} type={type} error={error} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !!error || !props.dirty}
              >
                Change limit
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { RaiseLimitDialog };
