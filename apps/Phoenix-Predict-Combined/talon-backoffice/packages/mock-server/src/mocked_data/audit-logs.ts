export type MockAuditLogEntry = {
  id?: string;
  createdAt: string;
  occurredAt?: string;
  logType?: string;
  punterId?: string;
  username?: string;
  action?: string;
  result?: string;
  product?: string;
  actorId?: string;
  userId?: string;
  targetId?: string;
  details?: string;
  reason?: string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
};

export const auditLogs: MockAuditLogEntry[] = [
  {
    createdAt: "2021-02-15 09:35:00+00:00",
    logType: "CREATION",
    punterId: "98549854",
    username: "Soft Alan",
  },
  {
    createdAt: "2021-02-15 09:35:00+00:00",
    logType: "AUTHENTICATION",
    punterId: "1298375492875",
    action: "/signIn",
    result: "SUCCESS",
    product: "sportsbook",
  },
  {
    createdAt: "2021-02-15 09:35:00+00:00",
    punterId: "1298375492875",
    logType: "ADJUSTMENT",
    userId: "1234-1234-1234-1234",
    action: "Deposit Limit Increased",
    reason: "Initiated by User",
    dataBefore: {
      daily: {
        current: 100.0,
        next: 100.0,
      },
    },
    dataAfter: {
      daily: {
        current: 100.0,
        next: 1500.0,
      },
    },
    product: "sportsbook",
  },
  {
    createdAt: "2026-03-07 11:00:00+00:00",
    occurredAt: "2026-03-07 11:00:00+00:00",
    punterId: "pm-user-001",
    userId: "pm-user-001",
    targetId: "pm-btc-120k-2026",
    action: "prediction.market.updated",
    details: "Operator refreshed live pricing bands after upstream market move.",
    product: "prediction",
  },
];
