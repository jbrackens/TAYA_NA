import * as React from "react";
import { Formik, FormikProps } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Redirect } from "react-router-dom";

import {
  selectSettingsIsLoading,
  selectBrandSettingsIsLoading,
  selectRewardSpinTypesByBrandAndType,
  selectRewardFieldsByBrandAndType
} from "../../../modules/app";
import { DrawerHeader, DrawerContent, Button, Loader } from "../../../components";
import { useQueryParameter } from "../../../hooks";
import { RootState, AppDispatch } from "../../../redux";
import { selectGameListOptions } from "../../Games";
import { fetchReward, updateReward, selectRewardById, selectRewardIsLoading } from "../rewardsSlice";
import { RewardForm } from "../RewardForm";
import { clearRewardValues } from "../utils";
import { IRewardFormValues } from "../types";
import { createValidationSchema } from "../validationSchema";

interface Props {
  onClose: () => void;
}
interface Params {
  brandId: string;
}

const EditReward: React.FC<Props> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();

  const searchParams = useQueryParameter();

  const isRewardParamExist = searchParams.has("id");
  const rewardId = searchParams.get("id") as string;

  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const isLoadingReward = useSelector(selectRewardIsLoading);

  const gameListOptions = useSelector(selectGameListOptions);

  const rewardFields = useSelector((state: RootState) => selectRewardFieldsByBrandAndType(state, brandId));
  const spinTypes = useSelector((state: RootState) => selectRewardSpinTypesByBrandAndType(state, brandId));

  const reward = useSelector((state: RootState) => selectRewardById(state, rewardId))!;

  React.useEffect(() => {
    dispatch(fetchReward({ rewardId: parseInt(rewardId), brandId }));
  }, [brandId, dispatch, rewardId]);

  const initialValues: IRewardFormValues = React.useMemo(
    () => ({
      creditType: reward?.reward.creditType,
      bonusCode: reward?.reward.bonusCode,
      externalId: reward?.reward.externalId,
      description: reward?.reward.description,
      cost: reward?.reward.cost,
      price: reward?.reward.price,
      spins: reward?.reward.spins,
      spinType: reward?.reward.spinType,
      spinValue: reward?.reward.spinValue,
      gameId: reward?.reward.gameId,
      currency: reward?.reward.currency,
      metadata: reward?.reward.metadata,
      active: reward?.reward.active
    }),
    [reward]
  );

  const handleUpdateReward = React.useCallback(
    async (values: IRewardFormValues) => {
      const rewardDraft = clearRewardValues(values) as Partial<IRewardFormValues>;

      const resultAction = await dispatch(
        updateReward({ id: reward.reward.id, values: { creditType: values.creditType, ...rewardDraft }, brandId })
      );

      if (updateReward.fulfilled.match(resultAction)) {
        onClose();
      }
    },
    [dispatch, reward, brandId, onClose]
  );

  if (isLoadingReward || settingsIsLoading || brandSettingsIsLoading || !reward || !rewardFields || !spinTypes) {
    return <Loader wrapped />;
  }

  if (!isRewardParamExist) {
    return <Redirect to="/not-found" />;
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createValidationSchema(rewardFields, gameListOptions)}
      onSubmit={handleUpdateReward}
    >
      {({ values, isValid, dirty, isSubmitting, handleSubmit }: FormikProps<IRewardFormValues>) => {
        return (
          <>
            <DrawerHeader
              actions={[
                <Button key="cancel" onClick={onClose}>
                  Cancel
                </Button>,
                <Button
                  disabled={!isValid || !dirty || isSubmitting}
                  appearance="blue"
                  type="submit"
                  key="edit-reward"
                  onClick={() => handleSubmit()}
                >
                  Save Reward
                </Button>
              ]}
            >
              Edit Reward
            </DrawerHeader>
            <DrawerContent>
              <RewardForm values={values} spinTypes={spinTypes} gameList={gameListOptions} />
            </DrawerContent>
          </>
        );
      }}
    </Formik>
  );
};

export default EditReward;
