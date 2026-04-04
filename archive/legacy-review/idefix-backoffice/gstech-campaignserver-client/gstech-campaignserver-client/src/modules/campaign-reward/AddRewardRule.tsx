import * as React from "react";
import { Formik, FormikProps, FormikHelpers } from "formik";
import { useSelector, useDispatch } from "react-redux";
import omit from "lodash/omit";
import { RewardRule } from "app/types";
import { toast } from "react-toastify";

import { DrawerHeader, DrawerContent } from "../../components/Drawer";
import { Button } from "../../components/Button";
import { selectLanguageTitles, selectSettingsIsLoading, selectBrandSettingsIsLoading } from "../app";
import { RewardRuleForm } from "./RewardRuleForm";
import { prepareValidationSchema } from "./prepareValidationSchema";
import { IRewardRuleFormValues } from "./types";
import { createRewardRule } from "./campaignRewardSlice";
import { AppDispatch } from "../../redux";
import { selectCampaignId } from "../campaign-info";
import { Loader } from "../../components";

interface Props {
  onClose: () => void;
}

const AddRewardRule: React.FC<Props> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();

  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brandSettingsIsLoading = useSelector(selectBrandSettingsIsLoading);
  const titles = useSelector(selectLanguageTitles);
  const campaignId = useSelector(selectCampaignId);

  const handleSubmit = React.useCallback(
    async (values: IRewardRuleFormValues, { setSubmitting }: FormikHelpers<IRewardRuleFormValues>) => {
      const submittedValues = {
        ...values,
        rewardId: values.reward?.id,
        minDeposit: values.minDeposit,
        maxDeposit: values.maxDeposit !== "" ? values.maxDeposit : undefined
      };

      const rewardDraft =
        submittedValues.trigger === "deposit"
          ? submittedValues
          : omit(submittedValues, ["minDeposit", "maxDeposit", "titles", "wager"]);

      const createRewardRuleAction = await dispatch(
        createRewardRule({ campaignId: campaignId!, values: rewardDraft as RewardRule })
      );

      if (createRewardRule.fulfilled.match(createRewardRuleAction)) {
        onClose();
      } else {
        setSubmitting(false);

        if (createRewardRuleAction.payload) {
          toast.error(`Create failed: ${createRewardRuleAction.payload.error.message}`);
        } else {
          toast.error(`Create failed: ${createRewardRuleAction.error.message}`);
        }
      }
    },
    [dispatch, campaignId, onClose]
  );

  const initialValues: IRewardRuleFormValues = React.useMemo(
    () => ({
      trigger: "deposit",
      minDeposit: "",
      maxDeposit: "",
      quantity: "1",
      wager: "5",
      useOnCredit: false,
      titles
    }),
    [titles]
  );

  if (settingsIsLoading || brandSettingsIsLoading) {
    return <Loader wrapped />;
  }

  return (
    <Formik
      validateOnMount
      initialValues={initialValues}
      validationSchema={prepareValidationSchema(titles)}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, isValid, dirty, isSubmitting, handleSubmit }: FormikProps<IRewardRuleFormValues>) => (
        <>
          <DrawerHeader
            actions={[
              <Button key="cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>,
              <Button
                disabled={!isValid || isSubmitting || !dirty}
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
            <RewardRuleForm values={values} setFieldValue={setFieldValue} />
          </DrawerContent>
        </>
      )}
    </Formik>
  );
};

export default AddRewardRule;
