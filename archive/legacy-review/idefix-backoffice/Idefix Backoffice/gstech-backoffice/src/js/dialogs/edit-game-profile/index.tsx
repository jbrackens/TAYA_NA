import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import pick from "lodash/fp/pick";
import { GameProfileForm, validationSchema } from "../../forms/game-profile";
import { closeDialog } from "../";
import { save } from "./actions";
import { GameProfile, RiskProfile } from "app/types";

export interface FormValues {
  name: string;
  wageringMultiplier: string | number;
  riskProfile: RiskProfile;
}

interface Props {
  payload: {
    brandId: string;
    gameProfile: GameProfile;
  };
  meta?: unknown;
}

const EditGameProfileDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const handleSave = useCallback(
    ({ name, wageringMultiplier, riskProfile }: FormValues, formActions: FormikHelpers<FormValues>) => {
      const { gameProfile, brandId } = payload;

      const gameProfileDraft = {
        name,
        brandId,
        wageringMultiplier: Number(wageringMultiplier),
        riskProfile,
      };

      dispatch(save({ gameProfileId: gameProfile.id, gameProfileDraft, formActions }));
    },
    [dispatch, payload],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-game-profile")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      ...pick(["name", "wageringMultiplier", "riskProfile"], payload && payload.gameProfile),
    }),
    [payload],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSave} validationSchema={validationSchema}>
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

export default EditGameProfileDialog;
