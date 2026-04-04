import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { Bonus, BonusLimit, CreateBonusRequest, CreateBonusValues, DIALOG } from "@idefix-backoffice/idefix/types";

import { fetchBonusLimits, fetchAvailableBonusLimits, save, create } from "./actions";
import { getBonusValues } from "./helpers";

interface Payload {
  bonus: Bonus;
  brandId: string;
  bonusLimits: BonusLimit[];
}

const useBonus = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { bonus, brandId, bonusLimits } = payload;

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
        limits
      } = formikValues;

      const bonusDraft: CreateBonusRequest = {
        name,
        active: active,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce: creditOnce,
        depositBonus: depositBonus,
        ...(depositBonus ? { depositCount, depositMatchPercentage, depositCountMatch: depositCountMatch } : {})
      };

      const mappedLimits = limits.map(({ currencyId, minAmount, maxAmount }) => ({
        currencyId,
        minAmount,
        maxAmount: depositBonus ? maxAmount : minAmount
      }));

      dispatch(
        save(
          {
            bonusId: bonus.id,
            brandId: bonus.brandId,
            bonusDraft,
            bonusLimits: mappedLimits
          },
          formikActions
        )
      );
    },
    [dispatch, bonus]
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
        limits
      } = formikValues;

      const bonusDraft: CreateBonusRequest = {
        name,
        active: active,
        wageringRequirementMultiplier,
        daysUntilExpiration,
        creditOnce: creditOnce,
        depositBonus: depositBonus,
        ...(depositBonus ? { depositCount, depositMatchPercentage, depositCountMatch: depositCountMatch } : {})
      };

      const mappedLimits = limits.map(({ currencyId, minAmount = null, maxAmount }) => ({
        currencyId,
        minAmount,
        maxAmount: depositBonus ? maxAmount : minAmount
      }));

      dispatch(create({ brandId, bonusDraft, bonusLimits: mappedLimits }, formikActions));
    },
    [dispatch, brandId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.BONUS)), [dispatch]);

  const initialValues = useMemo(
    () =>
      bonus
        ? getBonusValues(bonus, bonusLimits)
        : ({
            active: false,
            name: "",
            wageringRequirementMultiplier: 0,
            daysUntilExpiration: 0,
            creditOnce: false,
            depositBonus: false,
            depositCount: 0,
            depositMatchPercentage: 0,
            depositCountMatch: false,
            limits: bonusLimits
          } as CreateBonusValues),
    [bonus, bonusLimits]
  );

  return { handleUpdate, handleCreate, handleClose, initialValues };
};

export { useBonus };
