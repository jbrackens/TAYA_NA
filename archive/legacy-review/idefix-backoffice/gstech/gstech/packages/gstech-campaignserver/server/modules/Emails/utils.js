/* @flow */
import type {
  PlayerWithSubscriptionOptions,
  SubscriptionOptions,
} from "../Players/repository";

const moment = require('moment-timezone');

const elegibleForEmail =
  (contentSubtype: string): ((PlayerWithSubscriptionOptions) => boolean) =>
  ({
    // $FlowFixMe[deprecated-utility]
    subscriptionOptions = ({}: $Shape<SubscriptionOptions>),
    ...player
  }: PlayerWithSubscriptionOptions): boolean =>
    !player.gamblingProblem &&
    !player.potentialGamblingProblem &&
    !player.invalidEmail &&
    player.allowEmailPromotions &&
    !(player.segments && player.segments.some((el) => ['selfexcluded', 'limit'].includes(el))) &&
    (subscriptionOptions.emails === 'all' ||
      (['best_offer', 'new_and_best'].includes(contentSubtype) &&
        subscriptionOptions.emails === 'best_offers') ||
      (['new_game', 'new_and_best'].includes(contentSubtype) &&
        subscriptionOptions.emails === 'new_games')) &&
    (subscriptionOptions.snoozeEmailsUntil === null ||
      moment(subscriptionOptions.snoozeEmailsUntil) < moment());

module.exports = {
  elegibleForEmail,
};
