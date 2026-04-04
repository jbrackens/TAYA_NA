import { useCallback, useEffect, useMemo } from "react";
import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { CountrySettings, GameManufacturer, DIALOG } from "@idefix-backoffice/idefix/types";
import { EditManufacturerFormValues } from "@idefix-backoffice/idefix/forms";

import { fetchData, update } from "./actions";

interface Payload {
  gameManufacturerId: string;
  manufacturer?: GameManufacturer & { blockedCountries: unknown[] };
  countries?: CountrySettings[];
}

const useEditManuficturer = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const gameManufacturerId = payload.gameManufacturerId;
  const manufacturer = payload?.manufacturer;
  const countries = payload?.countries;

  useEffect(() => {
    dispatch(fetchData(gameManufacturerId));
  }, [dispatch, gameManufacturerId]);

  const handleSave = useCallback(
    (
      { active, blockedCountries }: EditManufacturerFormValues,
      formikActions: FormikHelpers<EditManufacturerFormValues>
    ) => {
      const draft = { active, blockedCountries: blockedCountries?.map(({ id }) => id) };
      dispatch(update({ gameManufacturerId, gameManufacturerDraft: draft, formikActions }));
    },
    [dispatch, gameManufacturerId]
  );
  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME_MANUFACTURER)), [dispatch]);

  const initialValues: EditManufacturerFormValues = useMemo(
    () =>
      ({
        ...pick(["active", "blockedCountries"], manufacturer),
        blockedCountries: countries?.filter(({ id }) => manufacturer?.blockedCountries?.includes(id))
      } as EditManufacturerFormValues),
    [countries, manufacturer]
  );

  return { handleSave, handleClose, initialValues };
};

export { useEditManuficturer };
