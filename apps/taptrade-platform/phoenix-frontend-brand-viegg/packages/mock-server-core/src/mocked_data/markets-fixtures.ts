export const fixtures = [
  {
    competitors: [
      {
        abbreviation: "LBZS",
        competitorId: "od:competitor:2108",
        name: "LBZS",
        qualifier: "home",
      },
      {
        abbreviation: "DeMonster",
        competitorId: "od:competitor:1864",
        name: "DeMonster",
        qualifier: "away",
      },
    ],
    fixtureId: "od:match:18872",
    fixtureName: "LBZS vs DeMonster",
    isLive: false,
    markets: [
      {
        exposure: {
          amount: 999.99,
          currency: "USD",
        },
        marketId: "od:match:18872:market:1",
        marketName: "Match winner - twoway",
        currentLifecycle: {
          changeReason: {
            status: "ACTIVE",
            type: "DATA_SUPPLIER_CHANGE",
          },
          type: "SETTLED",
        },
        lifecycleChanges: [
          {
            lifecycle: {
              changeReason: {
                status: "ACTIVE",
                type: "DATA_SUPPLIER_CHANGE",
              },
              type: "SETTLED",
            },
            updatedAt: "2020-10-28T17:41:36.457376",
          },
          {
            lifecycle: {
              changeReason: {
                status: "ACTIVE",
                type: "BACKOFFICE_CANCELLATION",
              },
              type: "NOT_BETTABLE",
            },
            updatedAt: "2020-10-28T15:41:36.457376",
          },
          {
            lifecycle: {
              changeReason: {
                status: "ACTIVE",
                type: "BACKOFFICE_CANCELLATION",
              },
              type: "BETTABLE",
            },
            updatedAt: "2020-10-22T15:41:36.457376",
          },
        ],
        selectionOdds: [
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "2",
            selectionName: "DeMonster",
            isStatic: true,
          },
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "1",
            selectionName: "LBZS",
            isStatic: false,
          },
        ],
      },
      {
        exposure: {
          amount: 999.99,
          currency: "USD",
        },
        marketId: "od:match:18872:market:2",
        marketName: "Map #1 winner",
        currentLifecycle: {
          changeReason: "Because so",
          type: "CANCELLED",
        },
        lifecycleChanges: [
          {
            lifecycle: {
              changeReason: "Because so",
              type: "CANCELLED",
            },
            updatedAt: "2020-10-28T17:41:36.457376",
          },
        ],
        selectionOdds: [
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "2",
            selectionName: "DeMonster",
            isStatic: true,
          },
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "1",
            selectionName: "LBZS",
            isStatic: false,
          },
        ],
      },
      {
        exposure: {
          amount: 999.99,
          currency: "USD",
        },
        marketId: "od:match:18872:market:3",
        marketName: "Headshots scoring",
        currentLifecycle: {
          changeReason: "Test change reason",
          type: "SETTLED",
        },
        lifecycleChanges: [
          {
            lifecycle: {
              changeReason: "Test change reason",
              type: "SETTLED",
            },
            updatedAt: "2020-10-28T17:41:36.457376",
          },
          {
            lifecycle: {
              changeReason: "Test change reason",
              type: "NOT_BETTABLE",
            },
            updatedAt: "2020-10-28T15:41:36.457376",
          },
          {
            lifecycle: {
              changeReason: "Test change reason",
              type: "BETTABLE",
            },
            updatedAt: "2020-10-22T15:41:36.457376",
          },
        ],
        selectionOdds: [
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "2",
            selectionName: "DeMonster",
            isStatic: true,
          },
          {
            displayOdds: {
              american: "+2000",
              decimal: 21.37,
              fractional: "20/1",
            },
            selectionId: "1",
            selectionName: "LBZS",
            isStatic: false,
          },
        ],
      },
    ],
    marketsTotalCount: 3,
    score: {
      away: 0,
      home: 1,
    },
    scoreHistory: [
      {
        score: {
          away: 0,
          home: 1,
        },
        updatedAt: "2020-10-28T17:41:56.457376",
      },
      {
        score: {
          away: 0,
          home: 0,
        },
        updatedAt: "2020-10-28T17:41:36.457376",
      },
    ],
    sport: {
      abbreviation: "Dota2",
      name: "Dota 2",
      sportId: "od:sport:2",
    },
    startTime: "2020-10-28T12:00:00",
    status: "NOT_STARTED",
    statusHistory: [
      {
        status: "NOT_STARTED",
        updatedAt: "2020-10-28T17:41:36.457376",
      },
    ],
  },
];
