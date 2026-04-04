import { Id } from "@phoenix-ui/utils";

export type TalonAuditLog =
  | TalonAuditLogCreation
  | TalonAuditLogAuthentication
  | TalonAuditLogAdjustment;
export type TalonAuditLogs = TalonAuditLog[];

export type TalonAuditLogCore = {
  punterId: Id;
  createdAt: string;
  category: TalonAuditLogCategory;
  type: TalonAuditLogType;
};

export enum TalonAuditLogCategory {
  CREATION = "ACCOUNT_CREATION",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum TalonAuditLogType {
  ACCOUNT_CREATION = "accountCreation",
  ACCOUNT_CLOSURE = "accountClosure",
}
