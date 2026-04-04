import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { GameProfileForm, validationSchema } from "../../forms/game-profile";
import { closeDialog } from "../";
import { save } from "./actions";
import { RiskProfile } from "app/types";

export interface FormValues {
  name: string;
  wageringMultiplier: string;
  riskProfile: RiskProfile;
}

interface Props {
  payload: {
    brandId: string;
  };
  meta?: unknown;
}

const CreateGameProfileDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { brandId } = payload;

  const handleSave = useCallback(
    ({ name, wageringMultiplier, riskProfile }: FormValues, formActions: FormikHelpers<FormValues>) => {
      const gameProfileDraft = {
        name,
        brandId,
        wageringMultiplier: Number(wageringMultiplier),
        riskProfile,
      };

      dispatch(save({ gameProfileDraft, formActions }));
    },
    [brandId, dispatch],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("create-game-profile")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      name: "",
      wageringMultiplier: "",
      riskProfile: "low",
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>Game profile</DialogTitle>
            <DialogContent>
              <GameProfileForm />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
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

export default CreateGameProfileDialog;
