import * as React from "react";
import { Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { Game } from "app/types";

import {
  selectThumbnailsOptions,
  selectThumbnailUrlsByBrand,
  selectThumbnailViewModes,
  selectSettingsIsLoading,
  selectBrandSettingsIsLoading
} from "../../../modules/app";
import { DrawerHeader, DrawerContent, Button, Loader } from "../../../components";
import { addGame, selectPermalinks, fetchGames } from "../gamesSlice";
import { AppDispatch, RootState } from "../../../redux";
import { GameForm } from "../GameForm";
import { validationSchema } from "../validationSchema";
import { formatParamsToObject } from "../utils";
import { IFormValues } from "../types";

interface Props {
  onClose: () => void;
}

interface Params {
  brandId: string;
}

const AddGame: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { brandId } = useParams<Params>();
  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const thumbnailsOptions = useSelector(selectThumbnailsOptions);
  const thumbnailsUrls = useSelector((state: RootState) => selectThumbnailUrlsByBrand(state, brandId));
  const permalinks = useSelector(selectPermalinks);
  const viewModes = useSelector((state: RootState) => selectThumbnailViewModes(state, brandId));

  const handleAddGame = React.useCallback(
    async (values: IFormValues) => {
      const { parameters } = values;

      const gameDraft = { ...values, parameters: formatParamsToObject(parameters) } as Game;

      const resultAction = await dispatch(addGame(gameDraft));

      if (addGame.fulfilled.match(resultAction)) {
        onClose();
      }

      dispatch(fetchGames(brandId));
    },
    [dispatch, onClose, brandId]
  );

  const initialValues: IFormValues = React.useMemo(
    () => ({
      brandId,
      name: "",
      permalink: "",
      manufacturer: "",
      active: false,
      thumbnailId: null,
      searchOnly: false,
      jackpot: false,
      newGame: true,
      promoted: false,
      dropAndWins: false,
      viewMode: "single",
      parameters: [],
      keywords: "",
      aspectRatio: "16x9",
      primaryCategory: "VideoSlot",
      tags: []
    }),
    [brandId]
  );

  if (settingsIsLoading || brandSettingsIsLoading) {
    return <Loader wrapped />;
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleAddGame} validationSchema={validationSchema}>
      {({ values, isSubmitting, handleSubmit, isValid, dirty }) => (
        <>
          <DrawerHeader
            actions={[
              <Button key="cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>,
              <Button
                appearance="blue"
                type="submit"
                key="edit-game"
                onClick={() => handleSubmit()}
                disabled={!isValid || !dirty || isSubmitting}
              >
                Add Game
              </Button>
            ]}
          >
            Add Game
          </DrawerHeader>
          <DrawerContent>
            <GameForm
              values={values}
              thumbnailsOptions={thumbnailsOptions}
              thumbnailsUrls={thumbnailsUrls}
              permalinks={permalinks}
              viewModes={viewModes}
            />
          </DrawerContent>
        </>
      )}
    </Formik>
  );
};

export default AddGame;
