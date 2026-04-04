import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { EditCountryForm, validationSchema } from "../../forms/edit-country";
import { openConfirmationDialog } from "../../core/components/confirmation-dialog";
import { closeDialog } from "../";
import { save } from "./actions";
import { CountrySettings, RiskProfile } from "app/types";

export interface FormValues {
  monthlyIncomeThreshold: null | number;
  id: string;
  name: string;
  minimumAge: boolean;
  registrationAllowed: boolean;
  loginAllowed: boolean;
  blocked: boolean;
  riskProfile: RiskProfile;
}

interface Props {
  payload: CountrySettings;
  meta?: unknown;
}

const EditCountryDialog: FC<Props> = ({ payload: country }) => {
  const dispatch = useDispatch();

  const handleSave = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const { minimumAge, registrationAllowed, loginAllowed, blocked, riskProfile, monthlyIncomeThreshold } = values;
      dispatch(
        save({
          brandId: country.brandId,
          countryId: country.id,
          countryDraft: {
            minimumAge,
            registrationAllowed: !!registrationAllowed,
            loginAllowed: !!loginAllowed,
            blocked,
            riskProfile,
            monthlyIncomeThreshold,
          },
          formikActions,
        }),
      );
    },
    [country.brandId, country.id, dispatch],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-country")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      ...pick(["id", "name", "minimumAge", "registrationAllowed", "loginAllowed", "blocked", "riskProfile"], country),
      monthlyIncomeThreshold: country && country.monthlyIncomeThreshold ? country.monthlyIncomeThreshold : null,
    }),
    [country],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Country</DialogTitle>
            <DialogContent>
              <EditCountryForm brandId={country.brandId} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                onClick={
                  country.brandId === "all"
                    ? () =>
                        dispatch(
                          openConfirmationDialog({
                            callback: props.submitForm,
                            message: "Changes will apply to all brands, continue?",
                          }),
                        )
                    : props.submitForm
                }
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                type="submit"
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

export default EditCountryDialog;
