import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers, FormikProps } from "formik";
import pick from "lodash/fp/pick";
import { getPlayerInfo } from "../player";
import { getBrandSettings } from "../app";
import { cancelEdit, editPlayer, fetchPlayerDetails, getPlayerDetailsForm, savePlayer } from "./playerDetailsSlice";
import Component from "./Component";
import { validationSchema } from "../../forms/player-details";
import { RootState } from "js/rootReducer";
import { BrandSettings, PlayerWithUpdate } from "app/types";

const Container = ({ playerId }: { playerId: number }) => {
  const dispatch = useDispatch();
  const player = useSelector(getPlayerInfo);
  const brandId = player?.brandId;
  const { isFetching, isEditing, isSaving, playerDetails } = useSelector((state: RootState) =>
    getPlayerDetailsForm(state, playerId),
  );
  const brandSettings = useSelector((state: RootState) => brandId && getBrandSettings(state, brandId)) as
    | BrandSettings
    | undefined;

  const countries = brandSettings?.countries || [];
  const languages = brandSettings?.languages || [];

  useEffect(() => {
    dispatch(fetchPlayerDetails(playerId));
  }, [dispatch, playerId]);

  const handleEditPlayer = useCallback(() => dispatch(editPlayer(playerId)), [dispatch, playerId]);
  const handleSubmit = useCallback(
    (formValues: PlayerWithUpdate, formikActions: FormikHelpers<PlayerWithUpdate>) => {
      dispatch(savePlayer({ playerId, formValues, formikActions }));
    },
    [dispatch, playerId],
  );
  const handleCancel = useCallback(
    resetForm => {
      resetForm();
      dispatch(cancelEdit(playerId));
    },
    [dispatch, playerId],
  );

  const initialValues = useMemo(
    () =>
      playerDetails && {
        ...pick(
          [
            "firstName",
            "lastName",
            "address",
            "postCode",
            "city",
            "email",
            "mobilePhone",
            "countryId",
            "languageId",
            "nationalId",
            "nationality",
            "placeOfBirth",
          ],
          playerDetails,
        ),
        dateOfBirth: new Date(playerDetails.dateOfBirth) || undefined,
      },
    [playerDetails],
  );

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize={true}
    >
      {(props: FormikProps<PlayerWithUpdate>) => (
        <Component
          isEditing={isEditing}
          isFetching={isFetching}
          isSaving={isSaving}
          onEdit={handleEditPlayer}
          onCancel={handleCancel}
          countries={countries}
          languages={languages}
          formikProps={props}
        />
      )}
    </Formik>
  );
};

export default Container;
