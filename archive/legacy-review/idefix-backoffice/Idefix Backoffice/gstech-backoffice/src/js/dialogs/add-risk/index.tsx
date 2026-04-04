import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { RiskDraft, RiskRole, RiskType } from "app/types";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { addRisk } from "./actions";
import { closeDialog } from "../";
import { EditRiskForm, validationSchema } from "../../forms/edit-risk";

export type FormValues = {
  type: RiskType | "";
  fraudKey: string;
  points: number;
  maxCumulativePoints: number;
  requiredRole: RiskRole | "";
  active: "true" | "false";
  name: string;
  title: string;
  description: string;
  manualTrigger: boolean;
};

interface Props {
  payload: unknown;
  meta?: unknown;
}

const AddRiskDialog: FC<Props> = () => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const riskDraft = { ...values, active: JSON.parse(values.active as string) } as RiskDraft;
      dispatch(addRisk(riskDraft, formikActions));
    },
    [dispatch],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("add-risk")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      type: "",
      fraudKey: "",
      points: 0,
      maxCumulativePoints: 0,
      requiredRole: "",
      active: "false",
      name: "",
      title: "",
      description: "",
      manualTrigger: true,
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Add Risk</DialogTitle>
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
                Add
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddRiskDialog;
