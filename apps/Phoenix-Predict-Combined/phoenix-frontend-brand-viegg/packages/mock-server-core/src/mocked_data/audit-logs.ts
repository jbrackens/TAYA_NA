export const auditLogs = [
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
  },
];
