/* @flow */

import type { UserSession } from "../types/common";

const canConfirm = (
  affiliate: { allowPayments: boolean, userId: ?Id, ... },
  session: UserSession,
): boolean =>
  affiliate.allowPayments &&
  (session.user.roles.includes('admin') || affiliate.userId === session.user.id);

const canMarkAsPaid = (
  affiliate: { allowPayments: boolean, userId: ?Id, ... },
  session: UserSession,
): boolean =>
  affiliate.allowPayments &&
  (session.user.roles.includes('admin') || session.user.roles.includes('payer'));

module.exports = {
  canConfirm,
  canMarkAsPaid,
};
