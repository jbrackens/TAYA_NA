import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { CreditBonusForm, validationSchema } from "../../forms/credit-bonus";
import { closeDialog } from "../";
import { creditBonus, fetchBonuses } from "./actions";

export interface FormValues {
  bonus: string;
  amount: string;
  expires: string;
}

interface Props {
  payload: number;
  meta: { id: string; title: string }[];
}

const CreditBonusDialog: FC<Props> = ({ payload: playerId, meta: bonuses = [] }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchBonuses(playerId));
  }, [dispatch, playerId]);

  const handleCredit = useCallback(
    ({ bonus, amount, expires }: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(
        creditBonus({
          playerId,
          bonusDraft: {
            id: bonus,
            amount: Number(amount),
            expiryDate: expires ? expires : undefined,
          },
          formikActions,
        }),
      );
    },
    [dispatch, playerId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("credit-bonus")), [dispatch]);

  const initialValues = useMemo(() => ({ bonus: "", amount: "", expires: "" }), []);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleCredit} validationSchema={validationSchema} initialValues={initialValues}>
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

export default CreditBonusDialog;
