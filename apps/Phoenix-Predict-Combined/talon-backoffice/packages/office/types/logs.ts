import { Id } from "@phoenix-ui/utils";

export enum TalonAuditLogCategory {
  CREATION = "ACCOUNT_CREATION",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum TalonAuditLogType {
  ACCOUNT_CREATION = "accountCreation",
  ACCOUNT_CLOSURE = "accountClosure",
}

export type TalonAuditLog = {
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
  category?: TalonAuditLogCategory | string;
  type?: TalonAuditLogType | string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  [key: string]: unknown;
};

export type TalonAuditLogs = TalonAuditLog[];
