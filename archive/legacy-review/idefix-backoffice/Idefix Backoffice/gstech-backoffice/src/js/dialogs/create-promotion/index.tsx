import React, { FC, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { PromotionForm, validationSchema } from "../../forms/promotion";
import { save } from "./actions";
import { closeDialog } from "../";
import { RootState } from "../../rootReducer";

export interface FormValues {
  name: string;
  multiplier: string | number;
  autoStart: boolean;
  allGames: boolean;
  calculateRounds: boolean;
  calculateWins: boolean;
  calculateWinsRatio: boolean;
  minimumContribution: string | number;
  games: number[];
  active: boolean;
}

interface Props {
  payload: {
    brandId: string;
  };
  meta?: unknown;
}

const CreatePromotionDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const gameList = useSelector((state: RootState) => state.settings.games);

  const handleSave = useCallback(
    (
      { name, multiplier, autoStart, allGames, calculateRounds, calculateWins, calculateWinsRatio, minimumContribution, games, active }: FormValues,
      formikActions: FormikHelpers<FormValues>,
    ) => {
      const promotionDraft = {
        name,
        multiplier,
        autoStart: !!autoStart,
        brandId: payload && payload.brandId,
        active: !!active,
        allGames: !!allGames,
        calculateRounds: !!calculateRounds,
        calculateWins: !!calculateWins,
        calculateWinsRatio: !!calculateWinsRatio,
        minimumContribution,
      };

      if (!allGames) {
        dispatch(save({ promotionDraft, games, formikActions }));
        return;
      }

      dispatch(save({ promotionDraft, formikActions }));
    },
    [dispatch, payload],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("create-promotion")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      name: "",
      multiplier: "",
      autoStart: false,
      allGames: false,
      calculateRounds: false,
      calculateWins: false,
      calculateWinsRatio: false,
      minimumContribution: "",
      games: [],
      active: false,
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSave}
        validationSchema={validationSchema}
        enableReinitialize={true}
      >
        {props => (
          <>
            <DialogTitle>Promotion</DialogTitle>
            <DialogContent>
              <PromotionForm gameList={gameList} formikProps={props} />
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
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default CreatePromotionDialog;
