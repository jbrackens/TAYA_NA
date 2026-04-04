import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { EditGameForm, validate } from "../../forms/edit-game";
import { closeDialog } from "../";
import { fetchData, save } from "./actions";
import { GameManufacturer, GameProfile } from "app/types";

export interface FormValues {
  gameId: string;
  name: string;
  manufacturerId: string;
  manufacturerGameId: string;
  mobileGame: boolean;
  playForFun: boolean;
  rtp: string;
  permalink: string;
  archived: boolean;
  profiles: number[];
}

interface Props {
  payload: unknown;
  meta: {
    manufacturers: GameManufacturer[];
    gameProfiles: { brandId: string; brandName: string; availableProfiles: GameProfile[] }[];
  };
}

const AddGameDialog: FC<Props> = ({ meta }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchData());
  }, [dispatch]);

  const handleSave = useCallback(
    ({
      gameId,
      name,
      manufacturerId,
      manufacturerGameId,
      mobileGame,
      playForFun,
      rtp,
      permalink,
      archived,
      profiles = [],
    }: FormValues) => {
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

      const profileDrafts = profiles.map((profile, index) => ({
        brandId: meta.gameProfiles[index].brandId,
        gameProfileId: profile,
      }));

      dispatch(save({ gameDraft, profileDrafts }));
    },
    [dispatch, meta],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("create-game")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      archived: false,
      gameId: "",
      manufacturerGameId: "",
      manufacturerId: "",
      mobileGame: false,
      name: "",
      permalink: "",
      playForFun: false,
      profiles: [],
      rtp: "",
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik initialValues={initialValues} onSubmit={handleSave} validate={validate}>
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

export default AddGameDialog;
