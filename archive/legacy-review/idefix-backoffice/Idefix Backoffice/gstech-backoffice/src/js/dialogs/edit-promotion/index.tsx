import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import pick from "lodash/fp/pick";
import api from "../../core/api";
import { PromotionForm, validationSchema } from "../../forms/promotion";
import { save } from "./actions";
import { closeDialog } from "../";
import { Promotion } from "app/types";
import { RootState } from "../../rootReducer";

export interface FormValues {
  games: number[];
  name: string;
  multiplier: string | number;
  autoStart: boolean;
  allGames: boolean;
  calculateRounds: boolean;
  calculateWins: boolean;
  calculateWinsRatio: boolean;
  active: boolean;
  minimumContribution: string | number;
}

interface Props {
  payload: {
    brandId: string;
    promotion: Promotion;
  };
  meta?: unknown;
}

const EditPromotionDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const [games, setGames] = useState<number[]>([]);
  const gameList = useSelector((state: RootState) => state.settings.games);
  const { promotion, brandId } = payload;
  const { allGames, id: promotionId } = promotion;

  useEffect(() => {
    if (!allGames) {
      api.settings.getPromotionGames(promotionId).then(games => setGames(games));
    }
  }, [promotionId, allGames]);

  const handleSave = useCallback(
    ({ name, multiplier, autoStart, allGames, calculateRounds, calculateWins, calculateWinsRatio, minimumContribution, games, active }, formikActions) => {
      const promotionDraft = {
        name,
        multiplier,
        autoStart: !!autoStart,
        active: !!active,
        allGames: !!allGames,
        calculateRounds: !!calculateRounds,
        calculateWins: !!calculateWins,
        calculateWinsRatio: !!calculateWinsRatio,
        minimumContribution,
      } as Omit<Promotion, "id">;

      allGames
        ? dispatch(save({ promotionId, promotionDraft, brandId, formikActions }))
        : dispatch(save({ promotionId, promotionDraft, brandId, games, formikActions }));
    },
    [dispatch, brandId, promotionId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-promotion")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      ...pick(
        ["name", "multiplier", "autoStart", "allGames", "calculateRounds", "calculateWins", "calculateWinsRatio", "active", "minimumContribution"],
        promotion,
      ),
      games,
    }),
    [games, promotion],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        onSubmit={handleSave}
        initialValues={initialValues}
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

export default EditPromotionDialog;
