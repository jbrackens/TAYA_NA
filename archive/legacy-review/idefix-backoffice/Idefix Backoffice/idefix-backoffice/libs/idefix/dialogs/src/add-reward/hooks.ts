import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";

import { Reward, DIALOG } from "@idefix-backoffice/idefix/types";
import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AddRewardFormValues } from "@idefix-backoffice/idefix/forms";

import { fetchRewards, addReward } from "./actions";

interface Payload {
  playerId: number;
  brandId: string;
  groupId: string;
  groupName: string;
}

const useAddReward = (payload: Payload, rewards: Reward[]) => {
  const dispatch = useAppDispatch();

  const { playerId, brandId, groupId } = payload;
  const filteredRewards =
    rewards && rewards.map(({ reward }) => ({ ...reward, title: `${reward.externalId} ${reward.description}` }));
  const isOneReward = filteredRewards?.length === 1;

  useEffect(() => {
    dispatch(fetchRewards(brandId, groupId));
  }, [dispatch, brandId, groupId]);

  const handleSubmit = useCallback(
    (values: AddRewardFormValues, formikActions: FormikHelpers<AddRewardFormValues>) => {
      const { rewardId, count, comment } = values;
      dispatch(addReward({ rewardId, playerId, count, groupId, brandId, comment }, formikActions));
    },
    [dispatch, playerId, groupId, brandId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_REWARD)), [dispatch]);

  const initialValues: AddRewardFormValues = useMemo(
    () => ({
      count: 1,
      rewardId: isOneReward ? filteredRewards[0]?.id : null
    }),
    [filteredRewards, isOneReward]
  );

  return { handleSubmit, handleClose, initialValues, filteredRewards, isOneReward };
};

export { useAddReward };
