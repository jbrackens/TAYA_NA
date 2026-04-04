import * as React from "react";
import { Formik } from "formik";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import pick from "lodash/pick";
import { Game } from "app/types";

import {
  fetchBrandThumbnails,
  selectThumbnailsOptions,
  selectThumbnailUrlsByBrand,
  selectThumbnailViewModes,
  selectSettingsIsLoading,
  selectBrandSettingsIsLoading
} from "../../../modules/app";
import { DrawerHeader, DrawerContent, Button, Loader } from "../../../components";
import { AppDispatch, RootState } from "../../../redux";
import { useQueryParameter } from "../../../hooks";
import { GameForm } from "../GameForm";
import { addGame, selectGameById, selectPermalinks } from "../gamesSlice";
import { formatParamsToArray, formatParamsToObject } from "../utils";
import { validationSchema } from "../validationSchema";
import { IFormValues } from "../types";

interface Props {
  onClose: () => void;
}

interface Params {
  brandId: string;
}

const CopyGame: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { brandId } = useParams<Params>();
  const searchParams = useQueryParameter();
  const newBrandId = searchParams.get("newBrandId") as string;
  const gameId = searchParams.get("id") as string;

  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const thumbnailsOptions = useSelector(selectThumbnailsOptions);
  const thumbnailsUrls = useSelector((state: RootState) => selectThumbnailUrlsByBrand(state, newBrandId));
  const permalinks = useSelector(selectPermalinks);
  const viewModes = useSelector((state: RootState) => selectThumbnailViewModes(state, newBrandId));
  const game = useSelector((state: RootState) => selectGameById(state, parseInt(gameId)))!;

  const handleAddGameCopy = React.useCallback(
    async (values: IFormValues) => {
      const { parameters } = values;

      const gameDraft = { ...values, parameters: formatParamsToObject(parameters) } as Game;

      const resultAction = await dispatch(addGame(gameDraft));

      if (addGame.fulfilled.match(resultAction)) {
        onClose();
      }
    },
    [dispatch, onClose]
  );

  const initialValues: IFormValues = React.useMemo(
    () =>
      ({
        ...pick(game, [
          "name",
          "manufacturer",
          "primaryCategory",
          "newGame",
          "jackpot",
          "searchOnly",
          "promoted",
          "dropAndWins",
          "thumbnailId",
          "aspectRatio",
          "viewMode",
          "keywords",
          "tags"
        ]),
        brandId: newBrandId,
        active: false,
        permalink: "",
        parameters: formatParamsToArray(game?.parameters)
      } as IFormValues),
    [game, newBrandId]
  );

  React.useEffect(() => {
    return () => {
      dispatch(fetchBrandThumbnails(brandId));
    };
  }, [dispatch, brandId]);

  if (settingsIsLoading || brandSettingsIsLoading) {
    return <Loader wrapped />;
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleAddGameCopy} validationSchema={validationSchema}>
      {({ values, isSubmitting, handleSubmit, isValid, dirty }) => (
        <>
          <DrawerHeader
            actions={[
              <Button key="close" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>,
              <Button
                appearance="blue"
                type="submit"
                key="add-game"
                onClick={() => handleSubmit()}
                disabled={!isValid || !dirty || isSubmitting}
              >
                Add Game
              </Button>
            ]}
          >
            Create copy on {newBrandId}
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

export default CopyGame;
