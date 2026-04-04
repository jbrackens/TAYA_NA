/* @flow */
const { DateTime } = require('luxon');
const { v1: uuid } = require('uuid');
const request = require('supertest');  

const pg = require('gstech-core/modules/pg');
const app = require('../../../app');
const dealsRepository = require('./deals/repository');
const playersRepository = require('./players/repository');
const paymentsRepository = require('../payments/repository');
const repository = require('./links/repository');

describe('Affiliate Admin Routes (user)', () => {
  let token = '';
  before(async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'user@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
  });

  it('non admin user cannot see close month button', async () => {
    const today = DateTime.local().plus({ months: -1 });
    const payment = await paymentsRepository.createAffiliatePayment(pg, {
      affiliateId: 9292929,
      transactionId: uuid(),
      transactionDate: today.toJSDate(),
      month: today.month,
      year: today.year,
      type: 'Commission',
      description: 'Some meaningful description',
      amount: 1000000,
    }, 1);

    await request(app)
      .get('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            ok: false,
          },
        });
      })
      .expect(200);

    await pg('payments').where({ id: payment.id }).delete();
  });

  it('non admin user cannot close month', async () => {
    await request(app)
      .put('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });
});

describe('Affiliate Admin Routes (admin)', () => {
  let token = '';
  before(async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'admin@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
  });

  it('can close month', async () => {
    await pg('closed_months').delete();
    await request(app)
      .get('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('close month', async () => {
    await request(app)
      .put('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            ok: true,
          },
        });
      })
      .expect(200);
  });

  it('cannot close month anymore', async () => {
    await request(app)
      .get('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: false,
        });
      })
      .expect(200);
  });

  it('can get affiliates', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(
          res.body.data.affiliates.filter((a) =>
            [3232323, 5454545, 7676767].includes(a.affiliateId),
          ),
        ).to.deep.equal([
          {
            affiliateId: 3232323,
            affiliateName: 'Giant Affiliate',
            affiliateEmail: 'elliot@gmail.com',
          },
          {
            affiliateId: 7676767,
            affiliateName: 'Super Affiliate',
            affiliateEmail: 'snow@gmail.com',
          },
          {
            affiliateId: 5454545,
            affiliateName: 'Mega Affiliate',
            affiliateEmail: 'bravo@gmail.com',
          },
        ]);
      })
      .expect(200);
  });

  it('can get affiliates overview', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(
          res.body.data.affiliates.filter((a) =>
            [3232323, 5454545, 7676767].includes(a.affiliateId),
          ),
        ).to.deep.equal([
          {
            affiliateId: 3232323,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 950000,
          },
          {
            affiliateId: 5454545,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 950000,
          },
          {
            affiliateId: 7676767,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 983880,
          },
        ]);

        expect(res.body.data.totals).to.deep.equal({
          activePlayers: 14,
          registeredPlayers: 214,
          depositingPlayers: 14,
          newRegisteredPlayers: 2,
          newDepositingPlayers: 2,
          netRevenue: 44200,
          deposits: 1332000,
          commission: 9120,
          cpa: 100200,
          balance: res.body.data.totals.balance,
        });

        expect(res.body.data.total).to.deep.equal(109320);
      })
      .expect(200);
  });

  it('can get affiliates overview including internals', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11?includeInternals=true')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(
          res.body.data.affiliates.filter((a) =>
            [3232323, 5454545, 7676767].includes(a.affiliateId),
          ),
        ).to.deep.equal([
          {
            affiliateId: 3232323,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 950000,
          },
          {
            affiliateId: 5454545,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 950000,
          },
          {
            affiliateId: 7676767,
            registeredPlayers: 4,
            depositingPlayers: 4,
            activePlayers: 4,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 66400,
            deposits: 304000,
            commission: 3040,
            cpa: 30400,
            balance: 983880,
          },
        ]);

        expect(res.body.data.totals).to.deep.equal({
          activePlayers: 14,
          registeredPlayers: 214,
          depositingPlayers: 14,
          newRegisteredPlayers: 2,
          newDepositingPlayers: 2,
          netRevenue: 44200,
          deposits: 1332000,
          commission: 9120,
          cpa: 100200,
          balance: res.body.data.totals.balance,
        });

        expect(res.body.data.total).to.deep.equal(109320);
      })
      .expect(200);
  });

  it('can get affiliates overview filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11?brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(
          res.body.data.affiliates.filter((a) =>
            [3232323, 5454545, 7676767].includes(a.affiliateId),
          ),
        ).to.deep.equal([
          {
            affiliateId: 3232323,
            registeredPlayers: 1,
            depositingPlayers: 1,
            activePlayers: 1,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 16600,
            deposits: 76000,
            commission: 760,
            cpa: 7600,
            balance: 950000,
          },
          {
            affiliateId: 5454545,
            registeredPlayers: 1,
            depositingPlayers: 1,
            activePlayers: 1,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 16600,
            deposits: 76000,
            commission: 760,
            cpa: 7600,
            balance: 950000,
          },
          {
            affiliateId: 7676767,
            registeredPlayers: 1,
            depositingPlayers: 1,
            activePlayers: 1,
            newRegisteredPlayers: 0,
            newDepositingPlayers: 0,
            conversionRate: 0,
            netRevenue: 16600,
            deposits: 76000,
            commission: 760,
            cpa: 7600,
            balance: 983880,
          },
        ]);

        expect(res.body.data.totals).to.deep.equal({
          activePlayers: 5,
          registeredPlayers: 205,
          depositingPlayers: 5,
          newRegisteredPlayers: 2,
          newDepositingPlayers: 2,
          netRevenue: -105200,
          deposits: 648000,
          commission: 2280,
          cpa: 31800,
          balance: res.body.data.totals.balance,
        });

        expect(res.body.data.total).to.deep.equal(34080);
      })
      .expect(200);
  });

  it('can get affiliate', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/5454545')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          affiliateId: 5454545,
          affiliateName: 'Mega Affiliate',

          contactName: 'Johnny Bravo',
          email: 'bravo@gmail.com',
          countryId: 'EE',
          address: 'Robinsoni 25',
          phone: '37256459863',
          skype: 'johnny.bravo',
          vatNumber: '564646548',
          info: 'Some meaningful information',
          allowEmails: true,

          paymentMinAmount: 10000,
          paymentMethod: 'skrill',
          paymentMethodDetails: {
            skrillAccount: 'bravo@gmail.com',
          },
          accountBalance: 950000,
          floorBrandCommission: false,
          allowNegativeFee: false,
          allowPayments: false,
          isInternal: false,
          isClosed: false,
          userId: 0,
          masterId: null,

          createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
          updatedAt: res.body.data.updatedAt,
          lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
        });
      })
      .expect(200);
  });

  it('can fail get non existing affiliate', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/9999999')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate not found',
          },
        });
      })
      .expect(404);
  });

  it('can update affiliate payment method', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/5454545')
      .set('x-auth-token', token)
      .send({
        name: 'Mega Affiliate',
        contactName: 'Johnny Bravo',
        countryId: 'EE',
        address: 'Robinsoni 25',
        email: 'bravo@gmail.com',
        phone: '37256459863',
        skype: 'johnny.bravo',
        vatNumber: '564646548',
        info: 'Some meaningful information',
        allowEmails: true,

        paymentMinAmount: 10000,
        paymentMethod: 'casinoaccount',
        paymentMethodDetails: {
          skrillAccount: 'bravo@gmail.com',
          casinoAccountEmail: 'bravo@gmail.com',
        },

        floorBrandCommission: false,
        allowNegativeFee: false,
        allowPayments: false,
        isInternal: false,
        isClosed: false,
        userId: 0,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 5454545,
            affiliateName: 'Mega Affiliate',

            contactName: 'Johnny Bravo',
            email: 'bravo@gmail.com',
            countryId: 'EE',
            address: 'Robinsoni 25',
            phone: '37256459863',
            skype: 'johnny.bravo',
            vatNumber: '564646548',
            info: 'Some meaningful information',
            allowEmails: true,

            paymentMinAmount: 10000,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: {
              casinoAccountEmail: 'bravo@gmail.com',
            },
            accountBalance: 950000,

            floorBrandCommission: false,
            allowNegativeFee: false,
            allowPayments: false,
            isInternal: false,
            isClosed: false,
            userId: 0,
            masterId: null,

            createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
          },
        });
      })
      .expect(200);
  });

  it('can update affiliate', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/5454545')
      .set('x-auth-token', token)
      .send({
        name: 'Mega Affiliate',
        contactName: 'Johnny Bravo',
        countryId: 'EE',
        address: 'Robinsoni 25',
        email: 'bravo@gmail.com',
        phone: '37256459863',
        skype: 'johnny.bravo',
        vatNumber: '564646548',
        info: 'Some meaningful information',
        allowEmails: true,

        paymentMinAmount: 10000,
        paymentMethod: 'skrill',
        paymentMethodDetails: {
          skrillAccount: 'bravo@gmail.com',
          bankPostCode: '32131',
          bankCountry: 'UK',
          bankClearingNumber: '',
          bankBic: 'JKCHKJDH',
          bankIban: '55-2543',
          bankAddress: '',
          bankName: 'Citibank',
          bankAccountHolder: 'Johnny Bravo',
        },

        floorBrandCommission: false,
        allowNegativeFee: false,
        allowPayments: false,
        isInternal: false,
        isClosed: false,
        userId: 0,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 5454545,
            affiliateName: 'Mega Affiliate',

            contactName: 'Johnny Bravo',
            email: 'bravo@gmail.com',
            countryId: 'EE',
            address: 'Robinsoni 25',
            phone: '37256459863',
            skype: 'johnny.bravo',
            vatNumber: '564646548',
            info: 'Some meaningful information',
            allowEmails: true,

            paymentMinAmount: 10000,
            paymentMethod: 'skrill',
            paymentMethodDetails: {
              skrillAccount: 'bravo@gmail.com',
            },
            accountBalance: 950000,

            floorBrandCommission: false,
            allowNegativeFee: false,
            allowPayments: false,
            isInternal: false,
            isClosed: false,
            userId: 0,
            masterId: null,

            createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
          },
        });
      })
      .expect(200);
  });

  it('can update affiliate without payment info', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/5454545')
      .set('x-auth-token', token)
      .send({
        name: 'Mega Affiliate',
        contactName: 'Johnny Bravo',
        countryId: 'EE',
        address: 'Robinsoni 25',
        email: 'bravo@gmail.com',
        phone: '37256459863',
        skype: 'johnny.bravo',
        vatNumber: '564646548',
        info: 'Some meaningful information',
        allowEmails: true,
        floorBrandCommission: false,
        allowNegativeFee: false,
        allowPayments: false,
        isInternal: false,
        isClosed: false,
        userId: 0,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 5454545,
            affiliateName: 'Mega Affiliate',

            contactName: 'Johnny Bravo',
            email: 'bravo@gmail.com',
            countryId: 'EE',
            address: 'Robinsoni 25',
            phone: '37256459863',
            skype: 'johnny.bravo',
            vatNumber: '564646548',
            info: 'Some meaningful information',
            allowEmails: true,

            paymentMinAmount: 10000,
            paymentMethod: 'skrill',
            paymentMethodDetails: {
              skrillAccount: 'bravo@gmail.com',
            },
            accountBalance: 950000,

            floorBrandCommission: false,
            allowNegativeFee: false,
            allowPayments: false,
            isInternal: false,
            isClosed: false,
            userId: 0,
            masterId: null,

            createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toISO(),
          },
        });
      })
      .expect(200);
  });


  it('can close affiliate', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/100019')
      .set('x-auth-token', token)
      .send({
        isClosed: true,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 100019,
            affiliateName: 'Random Affiliate',
            contactName: 'Random Contact Person',
            email: 'some100019@gmail.com',
            countryId: 'FI',
            address: 'Robinsoni 25',
            phone: null,
            skype: null,
            vatNumber: null,
            info: null,
            allowEmails: true,
            paymentMinAmount: 20000,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: { casinoAccountEmail: 'some@gmail.com' },
            accountBalance: 2000000,
            floorBrandCommission: true,
            allowNegativeFee: true,
            allowPayments: false,
            isInternal: false,
            isClosed: true,
            userId: null,
            masterId: null,

            createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: DateTime.utc(2019, 11, 11, 18, 15, 30).toISO(),
          },
        });
      })
      .expect(200);

      const affiliateDeals = await dealsRepository.getAffiliateDeals(pg, 100019);
      expect(affiliateDeals).to.deep.equal([]);

      const defaultDeal = await dealsRepository.findDeal(pg, 0, 0);
      const affiliatePlayers = await playersRepository.getActiveAffiliatePlayers(pg, 100019);

      const check = affiliatePlayers.every(({ planId }) => planId === defaultDeal.planId);
      expect(check).to.be.equal(true);
  });

  it('can get affiliate overview', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/overview/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          nrc: {
            current: 0,
          },
          ndc: {
            current: 0,
          },
          conversionRate: {
            current: 0,
          },
          monthlyCommission: {
            current: 33440,
          },
          registeredCustomers: 4,
          depositingCustomers: 4,
          activePlayers: 4,

          netRevenue: 66400,
          cpa: 30400,
          commission: 3040,

          accountBalance: 950000,
        });
      });
  });

  it('can get affiliate revenue', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/revenues/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
                playerId: 354732,
                planId: 1,
                countryId: 'CA',
                brandId: 'CJ',
                deal: 'FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-11-30T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: DateTime.utc(2019, 10, 1).toISO(),
                deposits: 76000,
                turnover: 106000,
                grossRevenue: 19600,
                bonuses: -7600,
                adjustments: -9100,
                fees: -760,
                tax: -760,
                netRevenue: 16600,
                commission: 760,
                cpa: 7600,
              },
              {
                playerId: 354733,
                planId: 2,
                countryId: 'FI',
                brandId: 'KK',
                deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-11-15T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: DateTime.utc(2019, 10, 2).toISO(),
                deposits: 76000,
                turnover: 106000,
                grossRevenue: 19600,
                bonuses: -7600,
                adjustments: -9100,
                fees: -760,
                tax: -760,
                netRevenue: 16600,
                commission: 760,
                cpa: 7600,
              },
              {
                playerId: 354734,
                planId: 3,
                countryId: 'DE',
                brandId: 'LD',
                deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-11-01T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: DateTime.utc(2019, 10, 3).toISO(),
                deposits: 76000,
                turnover: 106000,
                grossRevenue: 19600,
                bonuses: -7600,
                adjustments: -9100,
                fees: -760,
                tax: -760,
                netRevenue: 16600,
                commission: 760,
                cpa: 7600,
              },
              {
                playerId: 354735,
                planId: 4,
                countryId: 'NO',
                brandId: 'OS',
                deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-10-31T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: DateTime.utc(2019, 10, 4).toISO(),
                deposits: 76000,
                turnover: 106000,
                grossRevenue: 19600,
                bonuses: -7600,
                adjustments: -9100,
                fees: -760,
                tax: -760,
                netRevenue: 16600,
                commission: 760,
                cpa: 7600,
              },
            ],
            totals: {
              deposits: 304000,
              turnover: 424000,
              grossRevenue: 78400,
              bonuses: -30400,
              adjustments: -36400,
              fees: -3040,
              tax: -3040,
              netRevenue: 66400,
              commission: 3040,
              cpa: 30400,
            },
            total: 33440,
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate revenue filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/revenues/2019/11?brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
                playerId: 354734,
                planId: 3,
                countryId: 'DE',
                brandId: 'LD',
                deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-11-01T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: '2019-10-03T00:00:00.000Z',
                deposits: 76000,
                turnover: 106000,
                grossRevenue: 19600,
                bonuses: -7600,
                adjustments: -9100,
                fees: -760,
                tax: -760,
                netRevenue: 16600,
                commission: 760,
                cpa: 7600,
              },
            ],
            totals: {
              deposits: 76000,
              turnover: 106000,
              grossRevenue: 19600,
              bonuses: -7600,
              adjustments: -9100,
              fees: -760,
              tax: -760,
              netRevenue: 16600,
              commission: 760,
              cpa: 7600,
            },
            total: 8360,
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate revenue (zero floored commission)', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/100000/revenues/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
                playerId: 555555,
                planId: 1,
                countryId: 'EE',
                brandId: 'LD',
                deal: 'FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: res.body.data.revenues.items[0].clickDate,
                referralId: null,
                segment: null,
                registrationDate: DateTime.utc(2019, 11, 1).toISO(),
                deposits: 210000,
                turnover: 600000,
                grossRevenue: 0,
                bonuses: -20000,
                adjustments: -40000,
                fees: -25000,
                tax: 0,
                netRevenue: -85000,
                commission: -21250,
                cpa: 4500,
              },
            ],
            totals: {
              deposits: 210000,
              turnover: 600000,
              grossRevenue: 0,
              bonuses: -20000,
              adjustments: -40000,
              fees: -25000,
              tax: 0,
              netRevenue: -85000,
              commission: 0,
              cpa: 4500,
            },
            total: 4500,
          },
        });
      })
      .expect(200);
  });
});

describe('Affiliate Admin Routes (payer)', () => {
  let token = '';
  before(async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'payer@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
  });

  it('can close month', async () => {
    await pg('closed_months').delete();
    await request(app)
      .get('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('close month', async () => {
    await request(app)
      .put('/api/v1/admin/close-month')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can get affiliates', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can get affiliates overview', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can get affiliates overview including internals', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11?includeInternals=true')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can get affiliates overview filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/overview/2019/11?brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can get affiliate', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/5454545')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can fail get non existing affiliate', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/9999999')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'No permissions.',
          },
        });
      })
      .expect(403);
  });

  it('can handle redirection when player click on closed affiliate link', async () => {
    const [{ code }] = await repository.getAffiliateLinks(pg, 100019); // closed: 100019 active: 3232323
    await request(app)
      .get(`/clk/${code}`)
      .expect((res) => {
        const { location } = res.headers;
        expect(location).to.be.equal('https://luckydino.com')
      })
      .expect(302);
  });

});
