import * as React from "react";
import { Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Redirect } from "react-router-dom";
import { Game } from "app/types";
import pick from "lodash/pick";

import {
  selectThumbnailsOptions,
  selectThumbnailUrlsByBrand,
  selectThumbnailViewModes,
  selectSettingsIsLoading,
  selectBrandSettingsIsLoading
} from "../../../modules/app";
import { useQueryParameter } from "../../../hooks";
import { AppDispatch, RootState } from "../../../redux";
import { difference } from "../../../utils/difference";
import { Button, DrawerContent, DrawerHeader, Loader } from "../../../components";
import { selectGameById, selectPermalinks, updateGame } from "../gamesSlice";
import { GameForm } from "../GameForm";
import { formatParamsToArray, formatParamsToObject } from "../utils";
import { validationSchema } from "../validationSchema";
import { IFormValues } from "../types";

interface Props {
  onClose: () => void;
}

interface Params {
  brandId: string;
}

const EditGame: React.FC<Props> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const permalinks = useSelector(selectPermalinks);
  const { brandId } = useParams<Params>();
  const searchParams = useQueryParameter();

  const isGameIdExist = searchParams.has("id");
  const gameId = searchParams.get("id") as string;

  const game = useSelector((state: RootState) => selectGameById(state, parseInt(gameId)))!;
  const thumbnailsOptions = useSelector(selectThumbnailsOptions);
  const thumbnailsUrls = useSelector((state: RootState) => selectThumbnailUrlsByBrand(state, brandId));
  const viewModes = useSelector((state: RootState) => selectThumbnailViewModes(state, brandId));

  const handleUpdateGame = React.useCallback(
    async (values: IFormValues) => {
      const { parameters } = values;

      const gameDraft = difference({ ...values, parameters: formatParamsToObject(parameters) }, game) as Partial<Game>;

      const resultAction = await dispatch(updateGame({ gameId: parseInt(gameId), game: gameDraft }));

      if (updateGame.fulfilled.match(resultAction)) {
        onClose();
      }
    },
    [dispatch, gameId, game, onClose]
  );

  const initialValues: IFormValues = React.useMemo(() => {
    return {
      ...pick(game, [
        "active",
        "name",
        "permalink",
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
      parameters: formatParamsToArray(game?.parameters)
    } as IFormValues;
  }, [game]);

  if (settingsIsLoading || brandSettingsIsLoading) {
    return <Loader wrapped />;
  }

  if ((!game && isGameIdExist) || !isGameIdExist) {
    return <Redirect to="/not-found" />;
  }

  return (
    <Formik initialValues={initialValues} onSubmit={handleUpdateGame} validationSchema={validationSchema}>
      {({ values, isValid, dirty, isSubmitting, handleSubmit }) => (
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
                Save Game
              </Button>
            ]}
          >
            Edit Game
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

export default EditGame;
