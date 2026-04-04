import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { editRisk } from "./actions";
import { closeDialog } from "../";
import { EditRiskForm, validationSchema } from "../../forms/edit-risk";
import { Risk } from "app/types";

type Modify<T, R> = Omit<T, keyof R> & R;

export type FormValues = Modify<Risk, { active: string }>;

interface Props {
  payload: Risk;
  meta?: unknown;
}

const EditRiskDialog: FC<Props> = ({ payload: risk }) => {
  const dispatch = useDispatch();
  const { id: riskId, active } = risk;

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const riskDraft = { ...values, active: JSON.parse(values.active) } as Risk;
      dispatch(editRisk({ riskId, riskDraft, formikActions }));
    },
    [dispatch, riskId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-risk")), [dispatch]);

  const initialValues: FormValues = useMemo(() => ({ ...risk, active: active.toString() }), [active, risk]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Edit Risk</DialogTitle>
            <DialogContent>
              <EditRiskForm />
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
                Update
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default EditRiskDialog;
