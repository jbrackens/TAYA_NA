import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, bonusesSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CreditBonusFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const fetchBonusesAction = (playerId: number) => async (dispatch: AppDispatch) => {
  const bonuses = await api.players.getAvailableBonuses(playerId);
  dispatch(dialogsSlice.changeMeta(bonuses));
};

interface Props {
  playerId: number;
  bonusDraft: {
    id: string;
    amount: number;
    expiryDate: string | undefined;
  };
  formikActions: FormikHelpers<CreditBonusFormValues>;
}

export const creditBonus =
  ({ playerId, bonusDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.players.creditBonus(playerId, bonusDraft);
      dispatch(bonusesSlice.fetchBonuses(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.CREDIT_BONUS));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
