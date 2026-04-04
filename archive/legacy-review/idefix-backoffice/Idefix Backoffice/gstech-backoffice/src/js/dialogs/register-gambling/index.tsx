import React, { FC, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { RegisterGamblingForm, validationSchema } from "../../forms/register-gambling";
import { closeDialog } from "../";
import { registerGamblingProblem } from "./actions";
import { getPlayerInfo } from "../../modules/player";
import { getBrandSettings } from "../../modules/app";
import { GamblingProblemData, PlayerWithUpdate } from "app/types";
import { RootState } from "js/rootReducer";

interface Props {
  payload: unknown;
  meta?: unknown;
}

const RegisterGamblingProblem: FC<Props> = () => {
  const dispatch = useDispatch();
  const { brandId } = useSelector(getPlayerInfo) as PlayerWithUpdate;
  const brandSettings = useSelector((state: RootState) => getBrandSettings(state, brandId));
  const countries = brandSettings?.countries;

  const handleSubmit = useCallback(
    (values: GamblingProblemData["player"], formikActions: FormikHelpers<any>) => {
      const draft = {
        player: values,
      };
      dispatch(registerGamblingProblem(draft, formikActions));
    },
    [dispatch],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("register-gambling-problem")), [dispatch]);

  const initialValues = useMemo(
    () => ({
      firstName: "",
      lastName: "",
      email: "",
      countryId: "",
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleClose}>
      <Formik onSubmit={handleSubmit} validationSchema={validationSchema} initialValues={initialValues}>
        {formikProps => (
          <>
            <DialogTitle>Create Gambling Problem</DialogTitle>
            <DialogContent>
              <RegisterGamblingForm countries={countries} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={formikProps.submitForm}
                disabled={!formikProps.isValid || formikProps.isSubmitting || !formikProps.dirty}
                color="primary"
              >
                Create
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default RegisterGamblingProblem;
