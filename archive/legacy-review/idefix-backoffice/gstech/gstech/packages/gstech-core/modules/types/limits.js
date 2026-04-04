/* @flow */

export type LimitType = 'exclusion' | 'deposit_amount' | 'bet' | 'loss' | 'session_length' | 'timeout';
export type LimitPeriodType = 'monthly' | 'weekly' | 'daily';

export type Limit = {
  id: Id,
  active: boolean,
  createdAt: Date,
  expires: Date,
  type: LimitType,
  permanent: boolean,
  exclusionKey: UUID,
  limitValue: ?number,
  amount: Money,
  periodType: ?LimitPeriodType,
  limitLeft: ?number,
  limitDate: ?Date,
  canBeCancelled: ?boolean,
  isInternal: boolean,
  playerId: Id,
};

export type FullLimit = {
  reason: string,
  cancelled: Date,
} & Limit;

export type LimitDraft = {
  playerId: Id,
  permanent: boolean,
  expires: ?Date,
  reason: string,
  type: LimitType,
  limitValue: ?number,
  periodType?: LimitPeriodType,
  userId: ?Id,
  isInternal?: boolean,
};
