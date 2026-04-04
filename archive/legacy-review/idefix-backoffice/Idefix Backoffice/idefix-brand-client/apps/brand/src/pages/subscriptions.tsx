import * as React from "react";
import { NextPage } from "next";
import Router from "next/router";
import { redirect } from "@brandserver-client/utils";
import { useRegistry } from "@brandserver-client/ui";
import { SubscriptionV2 } from "@brandserver-client/types";
import { LobbyNextContext, Subscriptions } from "@brandserver-client/lobby";
import { VieState } from "../redux";

interface PageContext extends LobbyNextContext<VieState> {
  query: {
    lang: string;
    token?: string;
  };
}

interface InitialProps {
  token: string;
  lang: string;
  subscription: SubscriptionV2;
}

interface Props {
  token: string;
  lang: string;
  subscription: SubscriptionV2;
}

const SubscriptionsPage: NextPage<Props, InitialProps> = ({
  lang,
  subscription,
  token
}) => {
  const { FullScreenModal } = useRegistry();

  const handleCloseModal = React.useCallback(() => Router.push(`/${lang}`), []);

  return (
    <FullScreenModal onClose={handleCloseModal}>
      <Subscriptions
        subscription={subscription}
        promotionType="email"
        token={token}
      />
    </FullScreenModal>
  );
};

SubscriptionsPage.getInitialProps = async (ctx: PageContext) => {
  const {
    query: { token, lang },
    lobby: { api }
  } = ctx;

  if (!token) {
    redirect(ctx, `/${lang}`);
  }

  try {
    const subscription = await api.subscriptionV2.getSubscription(token);

    if (subscription.ok === false) {
      redirect(ctx, `/${lang}`);
    }

    return { lang, subscription, token };
  } catch (error) {
    redirect(ctx, `/${lang}`);
  }
};

export default SubscriptionsPage;
