import api from "../../core/api";
import { FormikHelpers } from "formik";
import { changeMeta, closeDialog } from "../";
import { fetchPlayerLedgers } from "../../modules/rewards";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";

export const fetchRewards = (brandId: string, groupId: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await api.players.getRewards(brandId, groupId);
    const rewards = response.data;
    dispatch(changeMeta(rewards));
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

export const addReward = (
  { rewardId, groupId, brandId, ...values }: Props,
  formikActions: FormikHelpers<FormValues>,
) => async (dispatch: AppDispatch) => {
  try {
    if (rewardId) {
      await api.players.addReward(rewardId, values);
    }
    dispatch(
      fetchPlayerLedgers({
        playerId: values.playerId,
        params: { group: groupId, brandId, pageIndex: 1, pageSize: 100 },
      }),
    );
    dispatch(closeDialog("add-reward"));
  } catch (err) {
    formikActions.setFieldError("general", err.message);
  }
};
