/* @flow */
const moment = require('moment-timezone');
const find = require('lodash/fp/find');
const pg = require('gstech-core/modules/pg');
const { players: { testPlayer } } = require('../../../scripts/utils/db-data');
const { fakeTransactions } = require('../../../scripts/fake-transactions');
const { getTransactionDates } = require('../transactions/Transaction');
const PlayerLiabilitiesReport = require('./PlayerLiabilitiesReport');
const GameTurnoverReport = require('./GameTurnoverReport');
const ResultsReport = require('./ResultsReport');
const PaymentReport = require('./PaymentReport');
const WithdrawReport = require('./WithdrawReport');
const PaymentSummaryReport = require('./PaymentSummaryReport');
const DailyActivityReport = require('./jobs/DailyActivityUpdateJob');
const GameTurnoverReportJob = require('./jobs/GameTurnoverUpdateJob');
const HourlyActivityUpdateJob = require('./jobs/HourlyActivityUpdateJob');
const PlayerGameSummaryUpdateJob = require('./jobs/PlayerGameSummaryUpdateJob');
const AccountStatementUpdateJob = require('./jobs/AccountStatementUpdateJob');
const PlayerRiskStatusReport = require('./PlayerRiskStatusReport');
const PlayerRiskTransactionReport = require('./PlayerRiskTransactionReport');
const LicenseReport = require('./LicenseReport');

const Player = require('../players/Player');
const { formatMoney } = require('../core/money');

const expectedResultReport = [{
  RTP: '0.0',
  bets: '€1,300.00',
  compensations: '€0.00',
  grossWin: '€1,300.00',
  jackpots: '€0.00',
  total: '-€983.40',
  turnedReal: '€2,283.40',
  wins: '€0.00',
},
{
  title: 'TOTAL',
  type: 'total',
  bets: '€1,300.00',
  wins: '€0.00',
  jackpots: '€0.00',
  grossWin: '€1,300.00',
  RTP: '0.0',
  turnedReal: '€2,283.40',
  compensations: '€0.00',
  total: '-€983.40',
},
];

const expectedLiabilitiesResult = [
  {
    title: 'EUR',
    type: 'total',
    startBalance: '€0.00',
    deposits: '€150.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    bets: '€6,400.00',
    turnToReal: '€9,300.20',
    compensations: '€0.00',
    endBalance: '€3,050.20',
  },
  {
    title: 'CasinoJEFE',
    brandId: 'CJ',
    currencyId: 'EUR',
    startBalance: '€0.00',
    deposits: '€50.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    bets: '€1,300.00',
    turnToReal: '€2,283.40',
    compensations: '€0.00',
    endBalance: '€1,033.40',
  },
  {
    title: 'LuckyDino',
    brandId: 'LD',
    currencyId: 'EUR',
    startBalance: '€0.00',
    deposits: '€100.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    bets: '€5,100.00',
    turnToReal: '€7,016.80',
    compensations: '€0.00',
    endBalance: '€2,016.80',
  },
  {
    title: 'Subtotal',
    currencyId: 'EUR',
    startBalance: '€0.00',
    deposits: '€150.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    bets: '€6,400.00',
    turnToReal: '€9,300.20',
    compensations: '€0.00',
    endBalance: '€3,050.20',
  },
  {
    title: 'SEK',
    type: 'total',
    startBalance: '€0.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    compensations: '€0.00',
  },
  {
    title: 'LuckyDino',
    brandId: 'LD',
    currencyId: 'SEK',
    startBalance: 'kr0.00',
    deposits: 'kr500.00',
    withdrawals: 'kr0.00',
    wins: 'kr0.00',
    bets: 'kr25,500.00',
    turnToReal: 'kr35,084.00',
    compensations: 'kr0.00',
    endBalance: 'kr10,084.00',
  },
  {
    title: 'TOTAL',
    currencyId: 'EUR',
    type: 'total',
    startBalance: '€0.00',
    withdrawals: '€0.00',
    wins: '€0.00',
    compensations: '€0.00',
  },
];

const expectedGameTurnoverResult = [ // eslint-disable-line
  {
    title: 'Starburst (NetEnt)',
    type: 'total',
    wins: '€0.00',
    bets: '€2,600.00',
    bonusWins: '€9,316.80',
    bonusBets: '€4,900.00',
    totalWins: '€9,316.80',
    totalBets: '€7,500.00',
    turnToReal: '€4,566.80',
    rounds: 1500,
    payout: '124.22',
  },
  {
    title: 'EUR',
    wins: '€0.00',
    bets: '€2,600.00',
    bonusWins: '€9,316.80',
    bonusBets: '€4,900.00',
    turnToReal: '€4,566.80',
    totalWins: '€9,316.80',
    totalBets: '€7,500.00',
    rounds: 1500,
    payout: '124.22',
  },
  {
    title: 'TOTAL',
    currencyId: 'EUR',
    type: 'total',
    wins: '€0.00',
    bets: '€2,600.00',
    bonusWins: '€9,316.80',
    bonusBets: '€4,900.00',
    turnToReal: '€4,566.80',
    totalWins: '€9,316.80',
    totalBets: '€7,500.00',
    rounds: 1500,
    payout: '124.22',
  },
];

describe('Reports with a player with transactions @slow', () => {
  let players;
  before(async function update(this: $npm$mocha$ContextDefinition) {
    this.timeout(300000);
    await clean.players();
    await setup.setFixedConversionRates();
    await pg.raw('delete from report_daily_brands');
    players = await Promise.all([
      Player.create(testPlayer({ brandId: 'LD' })),
      Player.create(testPlayer({ brandId: 'LD' })),
      Player.create(testPlayer({ brandId: 'LD', currencyId: 'SEK' })),
      Player.create(testPlayer({ brandId: 'CJ' })),
    ]);
    await Promise.all(players.map(fakeTransactions));
    await DailyActivityReport.update(new Date());
    await HourlyActivityUpdateJob.update(new Date());
  });

  describe('Transaction dates', () => {
    it('returns days with transaction activity', async() => {
      const dates = await getTransactionDates(players[0].id);
      expect(dates.length).to.equal(1);
    });
  });

  describe('Liabilities report', () => {
    it('generates report when month is not closed yet', async () => {
      const report = await PlayerLiabilitiesReport.report(new Date());
      expect(report).to.containSubset(expectedLiabilitiesResult);
    });

    it('can close month', async () => {
      await DailyActivityReport.update(moment().add(1, 'month').toDate());
      await AccountStatementUpdateJob.update(moment().add(1, 'month').toDate());
    });

    it('generates report using closed month report', async () => {
      const report = await PlayerLiabilitiesReport.report(new Date());
      expect(report).to.containSubset(expectedLiabilitiesResult);
    });

    it('matches current balance values', async () => {
      const report = await PlayerLiabilitiesReport.report(new Date());
      const { rows } = await pg.raw('select "currencyId", "brandId", sum("balance" + "reservedBalance") as balance from players group by "currencyId", "brandId"');
      rows.forEach((row) => {
        const matchingRow = find<any>(
          (r: { currencyId: string, brandId: BrandId }) =>
            r.currencyId === row.currencyId && r.brandId === row.brandId,
        )(report);
        if (matchingRow != null) {
          expect(formatMoney(row.balance, row.currencyId)).to.equal(matchingRow.endBalance);
        }
      });
    });
  });

  describe('Result report', () => {
    it('generates report when month is not closed yet', async () => {
      const report = await ResultsReport.report('CJ', 'year', null);
      expect(report).to.containSubset(expectedResultReport);
    });
  });

  describe('Deposit report', () => {
    it('generates report', async () => {
      await PaymentReport.report('deposit', new Date());
    });
  });

  describe('Withdraw report', () => {
    it('generates report', async () => {
      await WithdrawReport.report(new Date());
    });
  });


  describe('Deposit summary report', () => {
    it('generates report', async () => {
      await PaymentSummaryReport.report('deposit', new Date());
    });
  });


  describe('Game turnover report', () => {
    before(async () => await GameTurnoverReportJob.update(new Date()));

    it('generates report', async () => {
      await GameTurnoverReport.report(new Date(), 'CJ');
      // expect(report).to.containSubset(expectedGameTurnoverResult);
    });
  });

  describe('Player game summary report', () => {
    it('generates report data', async () => await PlayerGameSummaryUpdateJob.update(new Date()));

    it('reports revenues per game manufacturer', async () => {
      const report = await LicenseReport.report('MGA', new Date());
      expect(report).to.have.length(5)
    });
  });

  describe('Player risk status report', () => {
    before(async () => {
      await pg.raw('update players set "depositLimitReached"=now()');
    });

    it('generates report', async () => {
      const report = await PlayerRiskStatusReport.report('LD');
      expect(report.length).to.equal(3);
    });
  });

  describe('Player risk transaction report', () => {
    before(async () => {
      await pg.raw('update players set "riskProfile"=?', 'medium');
    });

    it('generates report', async () => {
      await PlayerRiskTransactionReport.report(new Date(), 'LD', 'medium');
    });
  });
});
