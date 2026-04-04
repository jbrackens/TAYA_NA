/* @flow */
import type {
  PlayerWithSubscriptionOptions,
  SubscriptionOptions,
} from "../Players/repository";

const moment = require('moment-timezone');

const elegibleForSms =
  (contentSubtype: string): ((PlayerWithSubscriptionOptions) => boolean) =>
  ({
    // $FlowFixMe[deprecated-utility]
    subscriptionOptions = ({}: $Shape<SubscriptionOptions>),
    ...player
  }: PlayerWithSubscriptionOptions): boolean =>
    !player.gamblingProblem &&
    !player.potentialGamblingProblem &&
    !player.invalidEmail &&
    player.allowSMSPromotions &&
    !(player.segments && player.segments.some((el) => ['selfexcluded', 'limit'].includes(el))) &&
    (subscriptionOptions.smses === 'all' ||
      (['best_offer', 'new_and_best'].includes(contentSubtype) &&
        subscriptionOptions.smses === 'best_offers') ||
      (['new_game', 'new_and_best'].includes(contentSubtype) &&
        subscriptionOptions.smses === 'new_games')) &&
    (subscriptionOptions.snoozeSmsesUntil === null ||
      moment(subscriptionOptions.snoozeSmsesUntil) < moment());

module.exports = {
  elegibleForSms,
};
