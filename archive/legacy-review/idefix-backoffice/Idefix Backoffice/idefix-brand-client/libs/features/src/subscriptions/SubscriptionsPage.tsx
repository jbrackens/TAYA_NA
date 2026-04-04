import * as React from "react";
import { SubscriptionV2 } from "@brandserver-client/types";
import { useRegistry } from "@brandserver-client/ui";
import { MyAccountPage } from "@brandserver-client/lobby";
import { withInitialProps } from "../with-initial-props";
import SubscriptionsView from "./SubscriptionsView";

interface IProps {
  data: SubscriptionV2 | undefined;
  isLoading: boolean;
}

const SubscriptionsPage: MyAccountPage<IProps, SubscriptionV2> = ({
  data,
  isLoading
}) => {
  const { Loader } = useRegistry();

  if (isLoading || !data) {
    return <Loader />;
  }

  return <SubscriptionsView subscription={data} />;
};

SubscriptionsPage.fetchInitialProps = async ({ lobby: { api } }) => {
  const subscription = await api.subscriptionV2.getSubscription();

  return subscription;
};

export default withInitialProps(SubscriptionsPage);
