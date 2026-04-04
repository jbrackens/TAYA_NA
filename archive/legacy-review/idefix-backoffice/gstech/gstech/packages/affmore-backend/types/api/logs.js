// @flow
import type { LogDraft } from '../repository/logs';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateLog = {
  logId: Id,
  note: string,
  attachments?: string[],

  createdBy: number,
  createdAt: Date,
  updatedAt: Date,
};

export type CreateAffiliateLogRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  log: LogDraft,
};

export type GetAffiliateLogRequest = {
  params: {
    affiliateId: Id,
  },
};

export type CreateAffiliateLogResponse = {
  log: AffiliateLog,
};

export type GetAffiliateLogsResponse = {
  logs: AffiliateLog[],
};
