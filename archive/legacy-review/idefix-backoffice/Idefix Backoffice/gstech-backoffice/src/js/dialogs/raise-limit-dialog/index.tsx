import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { LimitForm } from "../../forms/limit";
import { raiseLimit } from "./actions";
import { closeDialog } from "../";
import { ActiveLimit, LimitType } from "app/types";

interface Props {
  payload: { playerId: number; limit: ActiveLimit; type: LimitType };
  meta?: unknown;
}

const RaiseLimitDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const {
    playerId,
    limit: { id },
  } = payload;

  const handleRaiseLimit = useCallback(
    ({ period, limit, reason }, formikActions) => {
      const valuesDraft = {
        limit: limit || undefined,
        period: period || undefined,
        reason,
      };

      dispatch(raiseLimit(playerId, id, valuesDraft, formikActions));
    },
    [dispatch, id, playerId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("raise-limit")), [dispatch]);

  const type = payload && payload.type;
  const period = payload && payload.limit && payload.limit.periodType;
  const limit = payload && payload.limit && payload.limit.limitValue;
  const initialLimit = payload && payload.limit && payload.limit.limitValue;

  const initialValues = useMemo(
    () =>
      (payload &&
        payload.limit && {
          limit,
          period: ["deposit", "loss", "bet"].includes(type) && period,
        }) ||
      {},
    [limit, payload, period, type],
  );

  const requiresCheck = period !== initialValues.period || limit > initialLimit;
  const canBeCancelled = payload && payload.limit && payload.limit.canBeCancelled;
  const cancellationDays = payload && payload.limit && payload.limit.cancellationDays;
  const error = requiresCheck && !canBeCancelled && `Limit must have at least ${cancellationDays} days till the end`;

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

export default RaiseLimitDialog;
