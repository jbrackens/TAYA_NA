/* @flow */
const { DateTime } = require('luxon');
const { v1: uuid } = require('uuid');
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');
const app = require('../../../app');
const repository = require('./repository');
const invoicesRepository = require('../affiliates/invoices/repository');

describe('Payments Routes', () => {
  describe('as admin', () => {
    let token = '';
    let invoiceId;
    const today = DateTime.local();
    after(async () => {
      await pg('payments').where({ invoiceId }).delete();
      await pg('invoices').where({ id: invoiceId }).delete();
      await pg('closed_months').delete();
    });

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

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'Commission',
          description: 'Some meaningful description',
          amount: 1000000,
        },
        0,
      );

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'CPA',
          description: 'Some meaningful description',
          amount: 50000,
        },
        0,
      );

      const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });
      await pg('closed_months').delete();
      await pg('closed_months').insert({
        month,
        year,
        createdBy: 0,
        createdAt: DateTime.utc().toJSDate(),
      });
    });

    it('can get affiliate payments for confirmation', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId: null,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Unconfirmed',
                  paymentMethod: 'casinoaccount',
                  paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
                  taxRate: 18,
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  allowPayments: true,
                  canConfirm: true,
                  canMarkAsPaid: false,
                  userId: 1,
                  manager: 'user@luckydino.com',
                },
                {
                  affiliateId: 3232323,
                  name: 'Giant Affiliate',
                  contactName: 'Elliot Alderson',
                  status: 'Unconfirmed',
                  manager: 'admin@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });

    it('can confirm invoice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          invoiceId = res.body.data.invoiceId;
          expect(res.body.data).to.deep.equal({
            invoiceId,
            canConfirm: false,
            canMarkAsPaid: true,
          });
        })
        .expect(200);
    });

    it('fail to confirm affiliate with disallowed payments', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/3232323/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Affiliate payments are not allowed',
          });
        })
        .expect(403);
    });

    it('fail confirm invoice twice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Invoice already exists for this month',
          });
        })
        .expect(403);
    });

    it('can get affiliate confirmed payments', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Confirmed',
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  manager: 'user@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: true,
                },
                {
                  affiliateId: 3232323,
                  name: 'Giant Affiliate',
                  contactName: 'Elliot Alderson',
                  status: 'Unconfirmed',
                  manager: 'admin@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });

    it('can get affiliate invoice', async () => {
      await request(app)
        .get(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.deep.equal({
            invoiceDate: res.body.data.invoiceDate,
            invoiceNumber: res.body.data.invoiceNumber,
            company: {
              name: 'Esport Entertainment (Malta) ltd.',
              address1: '13/14 Penthouse Office',
              address2: 'Mannarino Road. Birkirkara BKR9080, Malta.',
              vatNumber: 'MT25295718',
            },
            affiliate: {
              name: 'New Affiliate',
              address: 'Robinsoni 25',
              vatNumber: '564626548',
              paymentMethod: 'casinoaccount',
              paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
            },
            payments: [
              {
                paymentId: res.body.data.payments[0].paymentId,
                transactionDate: res.body.data.payments[0].transactionDate,
                createdBy: 'admin@luckydino.com',
                type: 'Commission',
                description: 'Some meaningful description',
                amount: 1000000,
                tax: 180000,
                taxRate: 18,
                total: 1180000,
              },
              {
                paymentId: res.body.data.payments[1].paymentId,
                transactionDate: res.body.data.payments[1].transactionDate,
                createdBy: 'admin@luckydino.com',
                type: 'CPA',
                description: 'Some meaningful description',
                amount: 50000,
                tax: 9000,
                taxRate: 18,
                total: 59000,
              },
            ],
            totals: {
              creditAmount: 1050000,
              debitAmount: 0,
              amount: 1050000,
              tax: 189000,
              total: 1239000,
            },
            note: '',
            attachments: [`/uploads/${res.body.data.invoiceNumber}}/example.txt`],
          });
        })
        .expect(200);
    });

    it('can mark as paid', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.deep.equal({
            ok: true,
          });
        })
        .expect(200);
    });

    it('fail to mark as paid affiliate with disallowed payments', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/3232323/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Affiliate payments are not allowed',
          });
        })
        .expect(403);
    });

    it('fail mark as paid if wrong invoiceId', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/666`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Invoice not found',
          });
        })
        .expect(404);
    });

    it('fail to mark as paid again same invoice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Invoice already paid',
          });
        })
        .expect(409);
    });

    it('can get affiliate paid payments', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Paid',
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 1050000,
                  closingBalance: 0,
                  manager: 'user@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });
  });

  describe('as account manager', () => {
    let token = '';
    let invoiceId;
    const today = DateTime.local();
    after(async () => {
      await pg('payments').where({ invoiceId }).delete();
      await pg('invoices').where({ id: invoiceId }).delete();
      await pg('closed_months').delete();
    });

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

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'Commission',
          description: 'Some meaningful description',
          amount: 1000000,
        },
        0,
      );

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'CPA',
          description: 'Some meaningful description',
          amount: 50000,
        },
        0,
      );

      const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });
      await pg('closed_months').delete();
      await pg('closed_months').insert({
        month,
        year,
        createdBy: 0,
        createdAt: DateTime.utc().toJSDate(),
      });
    });

    it('can get affiliate payments for confirmation', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId: null,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Unconfirmed',
                  paymentMethod: 'casinoaccount',
                  paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
                  taxRate: 18,
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  allowPayments: true,
                  canConfirm: true,
                  canMarkAsPaid: false,
                  userId: 1,
                  manager: 'user@luckydino.com',
                },
              ],
            },
          });
        });
    });

    it("cannot confirm invoice if not affiliate's manager", async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/100019/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Operation is not allowed',
          });
        })
        .expect(403);
    });

    it('can confirm invoice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          invoiceId = res.body.data.invoiceId;
          expect(res.body.data).to.deep.equal({
            invoiceId,
            canConfirm: false,
            canMarkAsPaid: false,
          });
        })
        .expect(200);
    });

    it('fail confirm invoice twice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Invoice already exists for this month',
          });
        })
        .expect(403);
    });

    it('can get affiliate confirmed payments', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Confirmed',
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  manager: 'user@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });

    it('can get affiliate invoice', async () => {
      await request(app)
        .get(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.deep.equal({
            invoiceDate: res.body.data.invoiceDate,
            invoiceNumber: res.body.data.invoiceNumber,
            company: {
              name: 'Esport Entertainment (Malta) ltd.',
              address1: '13/14 Penthouse Office',
              address2: 'Mannarino Road. Birkirkara BKR9080, Malta.',
              vatNumber: 'MT25295718',
            },
            affiliate: {
              name: 'New Affiliate',
              address: 'Robinsoni 25',
              vatNumber: '564626548',
              paymentMethod: 'casinoaccount',
              paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
            },
            payments: [
              {
                paymentId: res.body.data.payments[0].paymentId,
                transactionDate: res.body.data.payments[0].transactionDate,
                createdBy: 'admin@luckydino.com',
                type: 'Commission',
                description: 'Some meaningful description',
                amount: 1000000,
                tax: 180000,
                taxRate: 18,
                total: 1180000,
              },
              {
                paymentId: res.body.data.payments[1].paymentId,
                transactionDate: res.body.data.payments[1].transactionDate,
                createdBy: 'admin@luckydino.com',
                type: 'CPA',
                description: 'Some meaningful description',
                amount: 50000,
                tax: 9000,
                taxRate: 18,
                total: 59000,
              },
            ],
            totals: {
              creditAmount: 1050000,
              debitAmount: 0,
              amount: 1050000,
              tax: 189000,
              total: 1239000,
            },
            note: '',
            attachments: [`/uploads/${res.body.data.invoiceNumber}}/example.txt`],
          });
        })
        .expect(200);
    });

    it('can mark as paid', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'No permissions.',
          });
        })
        .expect(403);
    });

    it('can get affiliate still not paid payments', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Confirmed',
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  manager: 'user@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });
  });

  describe('as payer role', () => {
    let token = '';
    let invoiceId;
    const today = DateTime.local();
    after(async () => {
      await pg('payments').where({ invoiceId }).delete();
      await pg('invoices').where({ id: invoiceId }).delete();
      await pg('closed_months').delete();
    });

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

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'Commission',
          description: 'Some meaningful description',
          amount: 1000000,
        },
        0,
      );

      await repository.createAffiliatePayment(
        pg,
        {
          affiliateId: 9292929,
          transactionId: uuid(),
          transactionDate: DateTime.utc().toJSDate(),
          month: today.month,
          year: today.year,
          type: 'CPA',
          description: 'Some meaningful description',
          amount: 50000,
        },
        0,
      );

      const { year, month } = DateTime.utc(today.year, today.month, 1).plus({ month: -1 });
      await pg('closed_months').delete();
      await pg('closed_months').insert({
        month,
        year,
        createdBy: 0,
        createdAt: DateTime.utc().toJSDate(),
      });
    });

    it('can get affiliate payments for confirmation', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId: null,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Unconfirmed',
                  paymentMethod: 'casinoaccount',
                  paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
                  taxRate: 18,
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  allowPayments: true,
                  canConfirm: false,
                  canMarkAsPaid: false,
                  userId: 1,
                  manager: 'user@luckydino.com',
                },
              ],
            },
          });
        });
    });

    it('cannot confirm invoice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices`)
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

    it('can get affiliate invoice', async () => {
      const payments = await repository.getAffiliatePaymentsToInvoice(pg, 9292929, today.year, today.month);
      const invoice = await invoicesRepository.createInvoice(pg, 9292929, payments, today.year, today.month, 0);
      invoiceId = invoice.id;

      await request(app)
        .get(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            data: {
              invoiceDate: res.body.data.invoiceDate,
              invoiceNumber: res.body.data.invoiceNumber,
              company: {
                name: 'Esport Entertainment (Malta) ltd.',
                address1: '13/14 Penthouse Office',
                address2: 'Mannarino Road. Birkirkara BKR9080, Malta.',
                vatNumber: 'MT25295718',
              },
              affiliate: {
                name: 'New Affiliate',
                address: 'Robinsoni 25',
                vatNumber: '564626548',
                paymentMethod: 'casinoaccount',
                paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
              },
              payments: [
                {
                  paymentId: res.body.data.payments[0].paymentId,
                  transactionDate: res.body.data.payments[0].transactionDate,
                  createdBy: 'admin@luckydino.com',
                  type: 'Commission',
                  description: 'Some meaningful description',
                  amount: 1000000,
                  tax: 180000,
                  taxRate: 18,
                  total: 1180000,
                },
                {
                  paymentId: res.body.data.payments[1].paymentId,
                  transactionDate: res.body.data.payments[1].transactionDate,
                  createdBy: 'admin@luckydino.com',
                  type: 'CPA',
                  description: 'Some meaningful description',
                  amount: 50000,
                  tax: 9000,
                  taxRate: 18,
                  total: 59000,
                },
              ],
              totals: {
                creditAmount: 1050000,
                debitAmount: 0,
                amount: 1050000,
                tax: 189000,
                total: 1239000,
              },
              note: '',
              attachments: [`/uploads/${res.body.data.invoiceNumber}}/example.txt`],
            },
          });
        })
        .expect(200);
    });

    it('can get affiliate payments for payment', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Confirmed',
                  paymentMethod: 'casinoaccount',
                  paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
                  taxRate: 18,
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 0,
                  closingBalance: 1050000,
                  allowPayments: true,
                  canConfirm: false,
                  canMarkAsPaid: true,
                  userId: 1,
                  manager: 'user@luckydino.com',
                },
              ],
            },
          });
        });
    });

    it('can mark as paid', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
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

    it('fail to mark as paid again same invoice', async () => {
      await request(app)
        .post(`/api/v1/admin/affiliates/9292929/invoices/${invoiceId}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.error).to.deep.equal({
            message: 'Invoice already paid',
          });
        })
        .expect(409);
    });

    it('can get affiliate paid payments', async () => {
      await request(app)
        .get(`/api/v1/admin/payments?year=${today.year}&month=${today.month}`)
        .set('x-auth-token', token)
        .expect((res) => {
          expect(res.body.data).to.containSubset({
            affiliates: {
              items: [
                {
                  affiliateId: 9292929,
                  invoiceId,
                  name: 'New Affiliate',
                  contactName: 'Jack Sparrow',
                  status: 'Paid',
                  openingBalance: 0,
                  creditedAmount: 1050000,
                  paidAmount: 1050000,
                  closingBalance: 0,
                  manager: 'user@luckydino.com',
                  canConfirm: false,
                  canMarkAsPaid: false,
                },
              ],
            },
          });
        });
    });
  });
});
