import React, { FC } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { LimitType } from "@idefix-backoffice/idefix/types";
import { LimitForm } from "@idefix-backoffice/idefix/forms";

import { useSetLimit } from "./hooks";

interface Props {
  payload: { type: LimitType; playerId: number };
  meta?: unknown;
}

const SetLimitDialog: FC<Props> = ({ payload }) => {
  const { handleSetLimit, handleClose, initialValues } = useSetLimit(payload);
  const type = payload?.type;

  return (
    <Dialog open={true} onClose={handleClose} transitionDuration={0}>
      <Formik onSubmit={handleSetLimit} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>{`Set ${type === "selfExclusion" ? "self exclusion" : `${type} limit`}`}</DialogTitle>
            <DialogContent>
              <Box>
                <LimitForm type={type} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Set limit
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { SetLimitDialog };
