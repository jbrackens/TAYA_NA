import { Id } from "@taptrade-ui/utils";

export enum OfficeAuditLogCategory {
  CREATION = "ACCOUNT_CREATION",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum OfficeAuditLogType {
  ACCOUNT_CREATION = "accountCreation",
  ACCOUNT_CLOSURE = "accountClosure",
}

export type OfficeAuditLog = {
  id?: string;
  action?: string;
  actorId?: string;
  userId?: Id;
  punterId?: Id;
  targetId?: string;
  freebetId?: string;
  oddsBoostId?: string;
  freebetAppliedCents?: number;
  product?: string;
  occurredAt?: string;
  createdAt?: string;
  details?: string;
  category?: OfficeAuditLogCategory | string;
  type?: OfficeAuditLogType | string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OfficeAuditLogs = OfficeAuditLog[];
