import { Bonus, BonusLimit, CreateBonusRequest, CreateBonusValues } from "app/types";
import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { BonusForm, validationSchema } from "../../forms/bonus";
import { closeDialog } from "../";
import { create, fetchAvailableBonusLimits, fetchBonusLimits, save } from "./actions";
import { getBonusValues } from "./helpers";

interface Payload {
  bonus: Bonus;
  brandId: string;
}

interface Props {
  payload: Payload;
  meta: BonusLimit[];
}

const BonusDialog: FC<Props> = ({ payload, meta: bonusLimits }) => {
  const dispatch = useDispatch();
  const { bonus, brandId } = payload;

  useEffect(() => {
    bonus ? dispatch(fetchBonusLimits(bonus.id)) : dispatch(fetchAvailableBonusLimits(brandId));
  }, [bonus, dispatch, brandId]);

  const handleUpdate = useCallback(
    (formikValues: CreateBonusValues, formikActions: FormikHelpers<CreateBonusValues>) => {
      const {
        active,
        name,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce,
        depositBonus,
        depositCount,
        depositCountMatch,
        depositMatchPercentage,
        limits,
      } = formikValues;

      const bonusDraft: CreateBonusRequest = {
        name,
        active: active,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce: creditOnce,
        depositBonus: depositBonus,
        ...(depositBonus ? { depositCount, depositMatchPercentage, depositCountMatch: depositCountMatch } : {}),
      };

      const mappedLimits = limits.map(({ currencyId, minAmount, maxAmount }) => ({
        currencyId,
        minAmount,
        maxAmount: depositBonus ? maxAmount : minAmount,
      }));

      dispatch(
        save(
          {
            bonusId: bonus.id,
            brandId: bonus.brandId,
            bonusDraft,
            bonusLimits: mappedLimits,
          },
          formikActions,
        ),
      );
    },
    [dispatch, bonus],
  );

  const handleCreate = useCallback(
    (formikValues: CreateBonusValues, formikActions: FormikHelpers<CreateBonusValues>) => {
      const {
        active,
        name,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce,
        depositBonus,
        depositCount,
        depositMatchPercentage,
        depositCountMatch,
        limits,
      } = formikValues;

      const bonusDraft: CreateBonusRequest = {
        name,
        active: active,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce: creditOnce,
        depositBonus: depositBonus,
        ...(depositBonus ? { depositCount, depositMatchPercentage, depositCountMatch: depositCountMatch } : {}),
      };

      const mappedLimits = limits.map(({ currencyId, minAmount = null, maxAmount }) => ({
        currencyId,
        minAmount,
        maxAmount: depositBonus ? maxAmount : minAmount,
      }));

      dispatch(create({ brandId, bonusDraft, bonusLimits: mappedLimits }, formikActions));
    },
    [dispatch, brandId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("bonus")), [dispatch]);

  const initialValues = useMemo(
    () =>
      bonus
        ? getBonusValues(bonus, bonusLimits)
        : ({
            active: false,
            name: "",
            wageringRequirementMultiplier: 0,
            daysUntilExpiration: 1,
            creditOnce: false,
            depositBonus: false,
            depositCount: 0,
            depositMatchPercentage: 0,
            depositCountMatch: false,
            limits: bonusLimits,
          } as CreateBonusValues),
    [bonus, bonusLimits],
  );

  return (
    <Dialog open={!!bonusLimits} transitionDuration={0} onClose={handleClose}>
      <Formik
        onSubmit={bonus ? handleUpdate : handleCreate}
        validationSchema={validationSchema}
        initialValues={initialValues}
      >
        {props => (
          <>
            <DialogTitle>Bonus</DialogTitle>
            {bonusLimits && (
              <DialogContent>
                <BonusForm bonusLimits={bonusLimits} values={props.values} />
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

export default BonusDialog;
