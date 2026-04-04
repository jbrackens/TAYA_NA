// @flow
import type { UserSession } from "../common";
import type {
  AdminFeeDraft,
  AdminFee,
  AdminFeeRuleDraft,
  AdminFeeRule,
  AdminFeeAffiliateInfo,
  AdminFeeWithComputedValues,
} from '../repository/admin-fees';

export type AdminFeeRequest = {
  session: UserSession,
  adminFeeId: Id,
};

export type DeleteAdminFeeRequest = {
  session: UserSession,
  params: {
    adminFeeId: Id,
  },
};

export type AdminFeeRequestDraft = {
  fee: AdminFeeDraft,
  rules: ?(AdminFeeRuleDraft[]),
};

export type CreateAdminFeeRequest = {
  session: UserSession,
  fee: AdminFeeDraft,
  rules: AdminFeeRuleDraft[],
};

export type UpdateAdminFeeRequest = {
  params: {
    adminFeeId: Id,
  },
  fee: AdminFeeDraft,
  rules: AdminFeeRuleDraft[],
};

export type CreateOrUpdateAdminFeeResponse = {
  fee: AdminFee,
  rules: AdminFeeRule[],
};

export type GetAdminFeesResponse = {
  fees: {
    ...$Diff<AdminFeeWithComputedValues, { id: Id }>,
    adminFeeId: Id,
  }[],
};

export type AdminFeeWithAffiliatesResponse = {
  fee: AdminFeeWithComputedValues,
  rules?: AdminFeeRule[],
  affiliates: AdminFeeAffiliateInfo[],
};
