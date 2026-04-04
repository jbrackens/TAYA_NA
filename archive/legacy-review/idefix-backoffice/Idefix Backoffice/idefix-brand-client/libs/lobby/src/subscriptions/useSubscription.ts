import * as React from "react";
import { SubscriptionType, SubscriptionV2 } from "@brandserver-client/types";
import { PromotionType } from "./types";

type Action =
  | {
      type: "updateSnooze";
      payload: { promotionType: PromotionType };
    }
  | {
      type: "updateSubscriptionOption";
      payload: { smses?: SubscriptionType; emails?: SubscriptionType };
    };

function reducer(state: SubscriptionV2, action: Action) {
  switch (action.type) {
    case "updateSnooze":
      return {
        ...state,
        [action.payload.promotionType === "email"
          ? "emailsSnoozed"
          : "smsesSnoozed"]:
          action.payload.promotionType === "email"
            ? !state.emailsSnoozed
            : !state.smsesSnoozed
      };
    case "updateSubscriptionOption":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export default function useSubscription(
  initialState: SubscriptionV2
): [SubscriptionV2, React.Dispatch<Action>] {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return [state, dispatch];
}
