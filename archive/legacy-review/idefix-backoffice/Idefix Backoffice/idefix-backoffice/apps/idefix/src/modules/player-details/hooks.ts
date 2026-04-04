import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import pick from "lodash/fp/pick";

import { useAppDispatch, useAppSelector, playerDetailsSlice, appSlice } from "@idefix-backoffice/idefix/store";
import { PlayerDetailsFormValues } from "@idefix-backoffice/idefix/forms";
import { FormikHelpers } from "formik";
import { BrandSettings } from "@idefix-backoffice/idefix/types";

export const PROPERTIES = {
  firstName: "Name",
  lastName: "Last name",
  email: "Email",
  mobilePhone: "Mobile phone",
  placeOfBirth: "Place of birth",
  address: "Street address",
  postCode: "Postcode",
  city: "City",
  dateOfBirth: "Date of birth",
  nationalId: "National ID",
  nationality: "Nationality",
  countryId: "Country of residence",
  languageId: "Language"
} as Record<string, string>;

export const KEYS = Object.keys(PROPERTIES);

export const usePlayerDetails = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const playerDetails = useAppSelector(playerDetailsSlice.getPlayerDetails);
  const brandId = playerDetails?.brandId;
  const brandSettings = useAppSelector(state => brandId && appSlice.getBrandSettings(state, brandId)) as
    | BrandSettings
    | undefined;

  const countries = brandSettings?.countries || [];
  const languages = brandSettings?.languages || [];

  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = useCallback(
    async (values: PlayerDetailsFormValues, formikHelpers: FormikHelpers<PlayerDetailsFormValues>) => {
      await dispatch(playerDetailsSlice.savePlayer({ playerId, values, formikHelpers }));
      setIsEditing(false);
    },
    [dispatch, playerId]
  );
  const handleEdit = useCallback(() => setIsEditing(prev => !prev), []);

  const initialValues = useMemo(
    () =>
      playerDetails
        ? {
            ...pick(KEYS, playerDetails),
            dateOfBirth: new Date(playerDetails.dateOfBirth) || undefined
          }
        : {
            ...KEYS.reduce((acc, value) => ({ ...acc, [value]: "" }), {}),
            dateOfBirth: undefined
          },
    [playerDetails]
  ) as PlayerDetailsFormValues;

  useEffect(() => {
    if (playerId) {
      dispatch(playerDetailsSlice.fetchPlayerDetails(playerId));
    }
  }, [dispatch, playerId]);

  return { initialValues, handleSubmit, isEditing, handleEdit, countries, languages };
};
