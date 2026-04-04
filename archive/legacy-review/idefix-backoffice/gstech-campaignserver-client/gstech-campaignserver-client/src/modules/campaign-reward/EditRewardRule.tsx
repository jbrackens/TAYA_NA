import * as React from "react";
import { Formik, FormikProps, FormikHelpers } from "formik";
import { useSelector, useDispatch } from "react-redux";
import omit from "lodash/omit";
import isEmpty from "lodash/isEmpty";
import { toast } from "react-toastify";
import { RewardRule } from "app/types";
import { Redirect } from "react-router-dom";

import { Button } from "../../components/Button";
import { DrawerHeader, DrawerContent } from "../../components/Drawer";
import { RootState, AppDispatch } from "../../redux";
import { selectCampaignId } from "../campaign-info";
import { selectRewardById } from "../rewards";
import { RewardRuleForm } from "./RewardRuleForm";
import { IRewardRuleFormValues } from "./types";
import { prepareValidationSchema } from "./prepareValidationSchema";
import { selectRewardRuleById, updateRewardRule } from ".";
import { useQueryParameter } from "../../hooks";
import { Loader } from "../../components";
import { selectSettingsIsLoading, selectBrandSettingsIsLoading, selectLanguageTitles } from "../app";

interface Props {
  onClose: () => void;
}

const EditRewardRule: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useQueryParameter();

  const isRewardRuleIdExist = searchParams.has("id");
  const rewardRuleId = searchParams.get("id") as string;

  const titles = useSelector(selectLanguageTitles);
  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const rewardRule = useSelector((state: RootState) => selectRewardRuleById(state, parseInt(rewardRuleId)));

  const reward = useSelector((state: RootState) => selectRewardById(state, rewardRule?.rewardId!));
  const campaignId = useSelector(selectCampaignId);

  const handleSubmit = React.useCallback(
    async (values: IRewardRuleFormValues, formikHelpers: FormikHelpers<IRewardRuleFormValues>) => {
      const submittedValues = {
        ...values,
        rewardId: values.reward?.id,
        minDeposit: values.minDeposit,
        maxDeposit: values.maxDeposit !== "" ? values.maxDeposit : undefined
      };

      const rewardDraft =
        submittedValues.trigger === "deposit"
          ? submittedValues
          : omit(submittedValues, ["minDeposit", "maxDeposit", "wager", "titles"]);

      const editRewardRuleAction = await dispatch(
        updateRewardRule({
          campaignId: campaignId!,
          rewardRuleId: parseInt(rewardRuleId),
          values: rewardDraft as RewardRule
        })
      );

      if (updateRewardRule.fulfilled.match(editRewardRuleAction)) {
        onClose();
      } else {
        formikHelpers.setSubmitting(false);
        if (editRewardRuleAction.payload) {
          toast.error(`Update failed: ${editRewardRuleAction.payload.error.message}`);
        } else {
          toast.error(`Update failed: ${editRewardRuleAction.error.message}`);
        }
      }
    },
    [dispatch, campaignId, rewardRuleId, onClose]
  );

  const initialValues: IRewardRuleFormValues = React.useMemo(
    () => ({
      trigger: rewardRule?.trigger || "deposit",
      minDeposit: rewardRule?.minDeposit || "",
      maxDeposit: rewardRule?.maxDeposit || "",
      quantity: rewardRule?.quantity || "",
      wager: rewardRule?.wager || "",
      titles: !isEmpty(rewardRule?.titles) ? rewardRule!.titles! : titles,
      useOnCredit: rewardRule?.useOnCredit || false,
      reward
    }),
    [reward, rewardRule, titles]
  );

  if (settingsIsLoading || brandSettingsIsLoading) {
    return <Loader wrapped />;
  }

  if ((!rewardRule && isRewardRuleIdExist) || !isRewardRuleIdExist) {
    return <Redirect to="/not-found" />;
  }

  return (
    <Formik
      validateOnMount
      initialValues={initialValues}
      validationSchema={prepareValidationSchema(rewardRule?.titles || titles)}
      onSubmit={handleSubmit}
    >
      {(formikProps: FormikProps<IRewardRuleFormValues>) => {
        const { values, setFieldValue, isValid, isSubmitting, handleSubmit } = formikProps;

        return (
          <>
            <DrawerHeader
              actions={[
                <Button key="cancel" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>,
                <Button
                  disabled={!isValid || isSubmitting}
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
              <RewardRuleForm values={values} setFieldValue={setFieldValue} />
            </DrawerContent>
          </>
        );
      }}
    </Formik>
  );
};

export default EditRewardRule;
