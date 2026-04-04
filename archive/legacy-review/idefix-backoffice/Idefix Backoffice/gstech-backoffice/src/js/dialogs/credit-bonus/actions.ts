import api from "../../core/api";
import { refetchBonuses } from "../../modules/bonuses";
import { closeDialog, changeMeta } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

export const fetchBonuses = (playerId: number) => async (dispatch: AppDispatch) => {
  const bonuses = await api.players.getAvailableBonuses(playerId);
  dispatch(changeMeta(bonuses));
};

interface Props {
  playerId: number;
  bonusDraft: {
    id: string;
    amount: number;
    expiryDate: string | undefined;
  };
  formikActions: FormikHelpers<FormValues>;
}

export const creditBonus = ({ playerId, bonusDraft, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.players.creditBonus(playerId, bonusDraft);
    dispatch(refetchBonuses(playerId));
    dispatch(closeDialog("credit-bonus"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
