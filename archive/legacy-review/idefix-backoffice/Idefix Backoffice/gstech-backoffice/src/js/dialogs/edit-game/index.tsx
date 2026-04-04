import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { EditGameForm, validate } from "../../forms/edit-game";
import { closeDialog } from "../";
import { fetchData, save } from "./actions";
import { GameManufacturer, GameProfileSetting, GameSettings } from "app/types";

export interface FormValues {
  gameId: string;
  name: string;
  manufacturerId: string;
  manufacturerGameId: string;
  mobileGame: boolean;
  rtp: string | number;
  playForFun: boolean;
  permalink: string;
  archived: boolean;
  profiles: (string | undefined)[] | null;
}

interface Props {
  payload: GameSettings;
  meta: {
    manufacturers: GameManufacturer[];
    gameProfiles: GameProfileSetting[];
  } | null;
}

const EditGameDialog: FC<Props> = ({ payload: game, meta }) => {
  const dispatch = useDispatch();
  const { id } = game;

  useEffect(() => {
    dispatch(fetchData(id));
  }, [dispatch, id]);

  const handleSave = useCallback(
    (
      {
        gameId,
        name,
        manufacturerId,
        manufacturerGameId,
        mobileGame,
        rtp,
        playForFun,
        permalink,
        archived,
        profiles = [],
      }: FormValues,
      formikActions: FormikHelpers<FormValues>,
    ) => {
      const gameDraft = {
        gameId,
        name,
        manufacturerId,
        manufacturerGameId,
        mobileGame: !!mobileGame,
        playForFun: !!playForFun,
        rtp: rtp ? Number(rtp) * 100 : null,
        permalink,
        archived: !!archived,
      };

      const profileDrafts =
        profiles?.map((profile, index) => ({
          brandId: meta?.gameProfiles[index].brandId || "",
          gameProfileId: Number(profile),
        })) || [];

      dispatch(save({ gameId: id, gameDraft, profileDrafts, formikActions }));
    },
    [dispatch, id, meta],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("edit-game")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () =>
      ({
        ...pick(
          [
            "name",
            "manufacturerName",
            "manufacturerId",
            "manufacturerGameId",
            "mobileGame",
            "playForFun",
            "gameId",
            "rtp",
            "permalink",
            "archived",
          ],
          game,
        ),
        profiles: meta && meta.gameProfiles && meta.gameProfiles.map(profile => profile.gameProfileId),
      } as FormValues),
    [game, meta],
  );

  return (
    <Dialog open={true && !!meta} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues} validate={validate}>
        {props => (
          <>
            <DialogTitle>Game</DialogTitle>
            {meta && (
              <DialogContent>
                <EditGameForm manufacturers={meta.manufacturers || []} gameProfiles={meta.gameProfiles || []} />
              </DialogContent>
            )}
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

export default EditGameDialog;
