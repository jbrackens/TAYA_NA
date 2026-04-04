import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { addReward, fetchRewards } from "./actions";
import { closeDialog } from "../";
import { AddRewardForm, validationSchema } from "../../forms/add-reward";
import { Reward } from "app/types";

export type FormValues = {
  count: number;
  rewardId: number | null;
  comment?: string;
};

interface Props {
  payload: {
    playerId: number;
    brandId: string;
    groupId: string;
    groupName: string;
  };
  meta: Reward[];
}

const AddRewardDialog: FC<Props> = ({ payload: { playerId, brandId, groupId, groupName }, meta: rewards }) => {
  const dispatch = useDispatch();
  const filteredRewards =
    rewards && rewards.map(({ reward }) => ({ ...reward, title: `${reward.externalId} ${reward.description}` }));
  const isOneReward = filteredRewards?.length === 1;

  useEffect(() => {
    dispatch(fetchRewards(brandId, groupId));
  }, [dispatch, brandId, groupId]);

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const { rewardId, count, comment } = values;
      dispatch(addReward({ rewardId, playerId, count, groupId, brandId, comment }, formikActions));
    },
    [dispatch, playerId, groupId, brandId],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("add-reward")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      count: 1,
      rewardId: isOneReward ? filteredRewards[0]?.id : null,
    }),
    [filteredRewards, isOneReward],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
        validateOnMount
        enableReinitialize
      >
        {props => (
          <>
            <DialogTitle>Add {groupName}</DialogTitle>
            <DialogContent>
              <AddRewardForm rewards={filteredRewards} isOneReward={isOneReward} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting}
                color="primary"
              >
                Add
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddRewardDialog;
