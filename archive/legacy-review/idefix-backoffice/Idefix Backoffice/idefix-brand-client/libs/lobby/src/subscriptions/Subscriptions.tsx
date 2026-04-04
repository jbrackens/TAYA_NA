import * as React from "react";
import { FormikHelpers } from "formik";
import {
  SubscriptionV2,
  UpdateSubscriptionV2
} from "@brandserver-client/types";
import { ApiContext } from "@brandserver-client/api";
import SubscriptionsForm from "./SubscriptionsForm";
import UnsubscribeBlock from "./UnsubscribeBlock";
import { Step, FormValues, PromotionType } from "./types";
import useSubscription from "./useSubscription";

interface Props {
  subscription: SubscriptionV2;
  promotionType: PromotionType;
  loggedin?: boolean;
  token?: string;
}

const Subscriptions: React.FC<Props> = ({
  subscription,
  promotionType,
  token,
  loggedin
}) => {
  const [{ emailsSnoozed, emails, email, smses, smsesSnoozed }, dispatch] =
    useSubscription(subscription);

  const subscriptionIsSnoozed = React.useMemo(
    () => (promotionType === "email" ? emailsSnoozed : smsesSnoozed),
    [promotionType, emailsSnoozed, smsesSnoozed]
  );

  const subscriptionIsUnsubscribed = React.useMemo(
    () => (promotionType === "email" ? emails === "none" : smses === "none"),
    [promotionType, emails, smses]
  );

  const [step, setStep] = React.useState<Step>(Step.Subscriptions);

  const api = React.useContext(ApiContext);

  const formInitialValues: FormValues = React.useMemo(() => {
    if (promotionType === "email") {
      return { emails: emailsSnoozed ? "snoozed" : emails };
    }

    return { smses: smsesSnoozed ? "snoozed" : smses };
  }, [emailsSnoozed, emails, smsesSnoozed, smses, promotionType]);

  const handleSnoozeSubscription = React.useCallback(async () => {
    try {
      await api.subscriptionV2.snoozeSubscription(
        { type: promotionType },
        token
      );
      setStep(Step.Result);
      dispatch({ type: "updateSnooze", payload: { promotionType } });
    } catch (error) {
      console.log(error, "error");
    }
  }, [token, promotionType]);

  const handleSubmitForm = React.useCallback(
    async (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      try {
        const shouldRevertSnooze =
          promotionType === "email" ? emailsSnoozed : smsesSnoozed;
        if (shouldRevertSnooze) {
          const response = await api.subscriptionV2.snoozeSubscription(
            {
              type: promotionType,
              revertSnooze: true
            },
            token
          );

          if (response.ok) {
            return dispatch({
              type: "updateSnooze",
              payload: { promotionType }
            });
          }

          return;
        }

        await api.subscriptionV2.updateSubscription(
          values as UpdateSubscriptionV2,
          token
        );

        dispatch({
          type: "updateSubscriptionOption",
          payload: values as UpdateSubscriptionV2
        });
      } catch (error) {
        console.log(error, "error");
      } finally {
        formikActions.setSubmitting(false);
      }
    },
    [token, emailsSnoozed, smsesSnoozed, promotionType]
  );

  const handleUnsubscribe = React.useCallback(async () => {
    try {
      const subscriptionData = {
        [promotionType === "email" ? "emails" : "smses"]: "none"
      } as UpdateSubscriptionV2;
      await api.subscriptionV2.updateSubscription(subscriptionData, token);
      dispatch({
        type: "updateSubscriptionOption",
        payload: subscriptionData
      });
      setStep(Step.Result);
    } catch (error) {
      console.log(error, "error");
    }
  }, [token, promotionType]);

  const handleResubscribe = React.useCallback(async () => {
    try {
      if (subscriptionIsSnoozed) {
        await api.subscriptionV2.snoozeSubscription(
          { type: promotionType, revertSnooze: true },
          token
        );
        dispatch({ type: "updateSnooze", payload: { promotionType } });
      }

      if (subscriptionIsUnsubscribed) {
        const subscriptionData = {
          [promotionType === "email" ? "emails" : "smses"]: "all"
        } as UpdateSubscriptionV2;
        await api.subscriptionV2.updateSubscription(subscriptionData, token);
        dispatch({
          type: "updateSubscriptionOption",
          payload: subscriptionData
        });
      }
      setStep(Step.Subscriptions);
    } catch (error) {
      console.log(error, "error");
    }
  }, [subscriptionIsSnoozed, subscriptionIsUnsubscribed, promotionType]);

  return (
    <React.Fragment>
      {step === Step.Subscriptions && (
        <SubscriptionsForm
          initialValues={formInitialValues}
          email={email}
          promotionType={promotionType}
          loggedin={loggedin}
          onSubmit={handleSubmitForm}
        />
      )}
      <UnsubscribeBlock
        snoozed={subscriptionIsSnoozed}
        unsubscribed={subscriptionIsUnsubscribed}
        step={step}
        promotionType={promotionType}
        loggedin={loggedin}
        onSetStep={setStep}
        onSnoozeSubscription={handleSnoozeSubscription}
        onUnsubscribe={handleUnsubscribe}
        onResubscribe={handleResubscribe}
      />
    </React.Fragment>
  );
};

export { Subscriptions };
