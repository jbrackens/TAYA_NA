import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, rewardsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AddRewardFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const fetchRewards = (brandId: string, groupId: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await api.players.getRewards(brandId, groupId);
    const rewards = response.data;
    dispatch(dialogsSlice.changeMeta(rewards));
  } catch (err) {
    console.log(err);
  }
};

interface Props {
  playerId: number;
  rewardId: number | null;
  count: number;
  groupId: string;
  brandId: string;
  comment?: string;
}

export const addReward =
  ({ rewardId, groupId, brandId, ...values }: Props, formikActions: FormikHelpers<AddRewardFormValues>) =>
  async (dispatch: AppDispatch) => {
    try {
      if (rewardId) {
        await api.players.addReward(rewardId, values);
      }
      dispatch(
        rewardsSlice.fetchPlayerLedgers({
          playerId: values.playerId,
          params: { group: groupId, brandId, pageIndex: 1, pageSize: 100 }
        })
      );
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_REWARD));
    } catch (err) {
      formikActions.setFieldError("general", err.message);
    }
  };
