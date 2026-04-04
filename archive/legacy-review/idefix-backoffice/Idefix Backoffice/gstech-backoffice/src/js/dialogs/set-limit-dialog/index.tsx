import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { LimitForm } from "../../forms/limit";
import { setLimit } from "./actions";
import { closeDialog } from "../";
import { LimitType } from "app/types";

interface Props {
  payload: { type: LimitType; playerId: number };
  meta?: unknown;
}

const SetLimitDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();

  const handleSetLimit = useCallback(
    ({ limit, period, isInternal, ...rest }, formikActions) => {
      const { type, playerId } = payload;

      const values = {
        limit: limit || undefined,
        period: period || undefined,
        isInternal: !isInternal,
        ...rest,
      };
      dispatch(setLimit(playerId, type, values, formikActions));
    },
    [dispatch, payload],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("set-limit")), [dispatch]);

  const initialValues = useMemo(() => ({ limit: "", isInternal: true, reason: "", duration: "", period: "" }), []);

  const type = payload && payload.type;

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

export default SetLimitDialog;
