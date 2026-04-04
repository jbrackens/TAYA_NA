import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CreditBonusFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { fetchBonusesAction, creditBonus } from "./actions";

const useCreditBonus = (playerId: number) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchBonusesAction(playerId));
  }, [dispatch, playerId]);

  const handleCredit = useCallback(
    ({ bonus, amount, expires }: CreditBonusFormValues, formikActions: FormikHelpers<CreditBonusFormValues>) => {
      dispatch(
        creditBonus({
          playerId,
          bonusDraft: {
            id: bonus,
            amount: Number(amount),
            expiryDate: expires ? expires : undefined
          },
          formikActions
        })
      );
    },
    [dispatch, playerId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CREDIT_BONUS)), [dispatch]);

  const initialValues = useMemo(() => ({ bonus: "", amount: "", expires: "" }), []);

  return { handleCredit, handleClose, initialValues };
};

export { useCreditBonus };
