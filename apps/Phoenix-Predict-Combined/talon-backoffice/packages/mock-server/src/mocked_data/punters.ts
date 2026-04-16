type WalletType = {
  bonusFunds: Array<any>;
  realMoney: {
    value: {
      amount: number;
      currency: string;
    };
  };
};

export const walletResponse: WalletType = {
  bonusFunds: [],
  realMoney: {
    value: {
      amount: 666,
      currency: "USD",
    },
  },
};

export const betsResponse = {
  currentPage: 1,
  data: [
    {
      betId: "1c836201-9a01-4d42-8c0b-870eb1e5bf98",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c2509",
            name: "Team SMG",
          },
          fixture: {
            id: "f41951",
            name: "BOOM Esports vs Team SMG",
            startTime: "2021-09-26T09:15:00Z",
            status: "IN_PLAY",
          },
          id: "1c836201-9a01-4d42-8c0b-870eb1e5bf98",
          market: {
            id: "e090e8e3-53d2-4622-be24-8039843b6d08",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "2",
            name: "away",
          },
          sport: {
            id: "s2",
            name: "Dota 2",
          },
          status: "OPEN",
          tournament: {
            id: "t1621",
            name: "BTS PRO SERIES S8 - SOUTHEAST ASIA",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.792012Z",
      sports: [
        {
          id: "s2",
          name: "Dota 2",
        },
      ],
      stake: {
        amount: 4,
        currency: "USD",
      },
    },
    {
      betId: "a6562049-3372-4005-a711-a8ab118caabc",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c824",
            name: "BOOM Esports",
          },
          fixture: {
            id: "f41951",
            name: "BOOM Esports vs Team SMG",
            startTime: "2021-09-26T09:15:00Z",
            status: "IN_PLAY",
          },
          id: "a6562049-3372-4005-a711-a8ab118caabc",
          market: {
            id: "e090e8e3-53d2-4622-be24-8039843b6d08",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "1",
            name: "home",
          },
          sport: {
            id: "s2",
            name: "Dota 2",
          },
          status: "OPEN",
          tournament: {
            id: "t1621",
            name: "BTS PRO SERIES S8 - SOUTHEAST ASIA",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.789815Z",
      sports: [
        {
          id: "s2",
          name: "Dota 2",
        },
      ],
      stake: {
        amount: 4,
        currency: "USD",
      },
    },
    {
      betId: "ad61d807-e8db-4e0f-bd5e-26ecf63bb3aa",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c1636",
            name: "CYCLOPS athlete gaming",
          },
          fixture: {
            id: "f33722",
            name: "Sengoku Gaming vs CYCLOPS athlete gaming",
            startTime: "2021-09-26T09:00:00Z",
            status: "IN_PLAY",
          },
          id: "ad61d807-e8db-4e0f-bd5e-26ecf63bb3aa",
          market: {
            id: "af2edb47-bfb3-455e-8d77-45a95c1f8d9b",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "2",
            name: "away",
          },
          sport: {
            id: "s16",
            name: "Rainbow Six",
          },
          status: "OPEN",
          tournament: {
            id: "t1213",
            name: "Japan League 2021",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.786863Z",
      sports: [
        {
          id: "s16",
          name: "Rainbow Six",
        },
      ],
      stake: {
        amount: 2,
        currency: "USD",
      },
    },
    {
      betId: "14205d3b-b504-47c3-914b-52f83fe2859f",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c785",
            name: "Sengoku Gaming",
          },
          fixture: {
            id: "f33722",
            name: "Sengoku Gaming vs CYCLOPS athlete gaming",
            startTime: "2021-09-26T09:00:00Z",
            status: "IN_PLAY",
          },
          id: "14205d3b-b504-47c3-914b-52f83fe2859f",
          market: {
            id: "af2edb47-bfb3-455e-8d77-45a95c1f8d9b",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "1",
            name: "home",
          },
          sport: {
            id: "s16",
            name: "Rainbow Six",
          },
          status: "OPEN",
          tournament: {
            id: "t1213",
            name: "Japan League 2021",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.784324Z",
      sports: [
        {
          id: "s16",
          name: "Rainbow Six",
        },
      ],
      stake: {
        amount: 4,
        currency: "USD",
      },
    },
    {
      betId: "b87633b4-d696-411e-a25b-ed0cbf2fc823",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c805",
            name: "Gank Gaming",
          },
          fixture: {
            id: "f44077",
            name: "Douyu Gaming vs Gank Gaming",
            startTime: "2021-09-26T09:30:00Z",
            status: "IN_PLAY",
          },
          id: "b87633b4-d696-411e-a25b-ed0cbf2fc823",
          market: {
            id: "cc2f28d5-850f-4e41-aee2-9a63a33f1db2",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "2",
            name: "away",
          },
          sport: {
            id: "s10",
            name: "Kings of Glory",
          },
          status: "OPEN",
          tournament: {
            id: "t1647",
            name: "King Pro League Fall 2021",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.781392Z",
      sports: [
        {
          id: "s10",
          name: "Kings of Glory",
        },
      ],
      stake: {
        amount: 2,
        currency: "USD",
      },
    },
    {
      betId: "54bda82f-02a8-4529-bf2b-672f17714c04",
      betType: "SINGLE",
      legs: [
        {
          competitor: {
            id: "c2725",
            name: "Douyu Gaming",
          },
          fixture: {
            id: "f44077",
            name: "Douyu Gaming vs Gank Gaming",
            startTime: "2021-09-26T09:30:00Z",
            status: "IN_PLAY",
          },
          id: "54bda82f-02a8-4529-bf2b-672f17714c04",
          market: {
            id: "cc2f28d5-850f-4e41-aee2-9a63a33f1db2",
            name: "Match winner - twoway",
          },
          displayOdds: {
            american: "+2000",
            decimal: 21.37,
            fractional: "20/1",
          },
          selection: {
            id: "1",
            name: "home",
          },
          sport: {
            id: "s10",
            name: "Kings of Glory",
          },
          status: "OPEN",
          tournament: {
            id: "t1647",
            name: "King Pro League Fall 2021",
          },
        },
      ],
      displayOdds: {
        american: "+2000",
        decimal: 21.37,
        fractional: "20/1",
      },
      placedAt: "2021-09-26T10:21:11.762821Z",
      sports: [
        {
          id: "s10",
          name: "Kings of Glory",
        },
      ],
      stake: {
        amount: 3,
        currency: "USD",
      },
    },
  ],
  hasNextPage: false,
  itemsPerPage: 20,
  totalCount: 6,
};

export const postBetsResponse = {
  betId: "betId123123123",
  result: 202,
};

export const limitsHistoryData = {
  data: [
    {
      period: "DAILY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
    {
      period: "WEEKLY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
    {
      period: "MONTHLY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
    {
      period: "DAILY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
    {
      period: "WEEKLY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
    {
      period: "MONTHLY",
      limit: "1hrs",
      effectiveFrom: "2021-01-18T12:51:28Z",
      limitType: "SessionTime",
      requestedAt: "2021-01-18T12:51:28Z",
    },
  ],
  hasNextPage: true,
  itemsPerPage: 10,
  totalCount: 30,
};
