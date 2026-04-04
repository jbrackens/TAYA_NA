import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { EditGameManufacturerForm } from "../../forms/edit-game-manufacturer";
import { closeDialog } from "../";
import { fetchData, update } from "./actions";
import { CountrySettings, GameManufacturer } from "app/types";

export interface FormValues {
  active: boolean;
  blockedCountries: { id: string; name: string }[];
}

interface Props {
  payload: string;
  meta: {
    manufacturer?: GameManufacturer & { blockedCountries: any[] };
    countries?: CountrySettings[];
  };
}

const EditGameManufacturerDialog: FC<Props> = ({ payload: gameManufacturerId, meta }) => {
  const dispatch = useDispatch();
  const manufacturer = meta?.manufacturer;
  const countries = meta?.countries;

  useEffect(() => {
    dispatch(fetchData(gameManufacturerId));
  }, [dispatch, gameManufacturerId]);

  const handleSave = useCallback(
    ({ active, blockedCountries }: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const draft = { active, blockedCountries: blockedCountries?.map(({ id }) => id) };
      dispatch(update({ gameManufacturerId, gameManufacturerDraft: draft, formikActions }));
    },
    [dispatch, gameManufacturerId],
  );
  const handleClose = useCallback(() => dispatch(closeDialog("edit-game-manufacturer")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () =>
      ({
        ...pick(["active", "blockedCountries"], manufacturer),
        blockedCountries: countries?.filter(({ id }) => manufacturer?.blockedCountries?.includes(id)),
      } as FormValues),
    [countries, manufacturer],
  );

  return (
    <Dialog open={true && !!meta} transitionDuration={0} onClose={handleClose}>
      <Formik onSubmit={handleSave} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Game Manufacturer</DialogTitle>
            {countries && (
              <DialogContent>
                <EditGameManufacturerForm countries={countries} {...props} />
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={props.isSubmitting || !props.dirty}
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

export default EditGameManufacturerDialog;
