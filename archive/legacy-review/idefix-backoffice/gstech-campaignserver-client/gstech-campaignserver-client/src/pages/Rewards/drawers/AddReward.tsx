import * as React from "react";
import { useParams } from "react-router-dom";
import { Formik, FormikProps } from "formik";
import { useDispatch, useSelector } from "react-redux";

import {
  selectSettingsIsLoading,
  selectBrandSettingsIsLoading,
  selectRewardDefinitionIdByBrandAndType,
  selectRewardSpinTypesByBrandAndType,
  selectRewardFieldsByBrandAndType,
  selectRewardFieldsRequiredWithOptions
} from "../../../modules/app";
import { selectGameListOptions } from "../../Games";
import { RootState, AppDispatch } from "../../../redux";
import { DrawerHeader, DrawerContent, Button, Loader } from "../../../components";
import { RewardForm } from "../RewardForm";
import { CREDIT_TYPES } from "../utils";
import { IRewardFormValues } from "../types";
import { createReward } from "../rewardsSlice";
import { createValidationSchema } from "../validationSchema";

interface Params {
  brandId: string;
}
interface Props {
  onClose: () => void;
}

const AddReward: React.FC<Props> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();

  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);

  const gameListOptions = useSelector(selectGameListOptions);

  const rewardDefinitionId = useSelector((state: RootState) => selectRewardDefinitionIdByBrandAndType(state, brandId)!);
  const spinTypes = useSelector((state: RootState) => selectRewardSpinTypesByBrandAndType(state, brandId)!);
  const rewardFields = useSelector((state: RootState) => selectRewardFieldsByBrandAndType(state, brandId)!);

  const fieldsRequiredWithOptions = useSelector(
    (state: RootState) => selectRewardFieldsRequiredWithOptions(state, brandId)!
  );

  const handleCreateReward = React.useCallback(
    async (reward: IRewardFormValues) => {
      const resultAction = await dispatch(createReward({ rewardDefinitionId, reward, brandId }));

      if (createReward.fulfilled.match(resultAction)) {
        onClose();
      }
    },
    [dispatch, rewardDefinitionId, brandId, onClose]
  );

  const initialValues: IRewardFormValues = React.useMemo(
    () => ({
      externalId: "",
      creditType: CREDIT_TYPES[0],
      gameId: gameListOptions[0]?.value,
      bonusCode: "",
      cost: "",
      description: "",
      active: false,
      ...fieldsRequiredWithOptions
    }),
    [gameListOptions, fieldsRequiredWithOptions]
  );

  if (settingsIsLoading || brandSettingsIsLoading || !rewardFields) {
    return <Loader wrapped />;
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createValidationSchema(rewardFields, gameListOptions)}
      onSubmit={handleCreateReward}
    >
      {({ values, isValid, dirty, isSubmitting, handleSubmit }: FormikProps<IRewardFormValues>) => (
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
                key="add-reward"
                onClick={() => handleSubmit()}
              >
                Add Reward
              </Button>
            ]}
          >
            Add New Reward
          </DrawerHeader>
          <DrawerContent>
            <RewardForm values={values} spinTypes={spinTypes} gameList={gameListOptions} />
          </DrawerContent>
        </>
      )}
    </Formik>
  );
};

export default AddReward;
