/* @flow */
const { DateTime } = require('luxon');
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const request = require('supertest');  

const app = require('../../../../app');
const repository = require('../../payments/repository');
const invoiceRepository = require('./repository');

describe('Invoices Routes', () => {
  let token = '';
  let invoiceId;
  let attachment;
  const today = DateTime.local();

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

  after(async () => {
    await pg('payments').where({ affiliateId: 9292929 }).delete();
    await pg('invoices').where({ affiliateId: 9292929 }).delete();
  });

  it('can create affiliate invoice', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/100000/invoice-draft')
      .set('x-auth-token', token)
      .send({
        type: 'Manual',
        description: 'description for the payment',
        amount: 1100,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can get affiliate invoices', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/invoices')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          draft: {
            payments: {
              items: [{
                paymentId: 4,
                transactionDate: DateTime.utc(2019, 11, 27, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 370000,
                createdBy: 'admin@luckydino.com',
              }, {
                paymentId: 3,
                transactionDate: DateTime.utc(2019, 11, 17, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 270000,
                createdBy: 'admin@luckydino.com',
              }, {
                paymentId: 2,
                transactionDate: DateTime.utc(2019, 11, 10, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 200000,
                createdBy: 'admin@luckydino.com',
              }, {
                paymentId: 1,
                transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 110000,
                createdBy: 'admin@luckydino.com',
              }],
              totals: {
                amount: 950000,
              },
              total: 950000,
            },
            canConfirm: false,
          },
          invoices: {
            items: [],
          }
        });
      })
      .expect(200);
  });

  it('can get affiliate invoice draft', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/invoice-draft')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          company: {
            name: 'Esport Entertainment (Malta) ltd.',
            address1: '13/14 Penthouse Office',
            address2: 'Mannarino Road. Birkirkara BKR9080, Malta.',
            vatNumber: 'MT25295718',
          },
          affiliate: {
            name: 'Giant Affiliate',
            address: 'Robinsoni 25',
            vatNumber: null,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: { casinoAccountEmail: 'elliot@gmail.com' },
          },
          payments: [{
            paymentId: 4,
            transactionDate: DateTime.utc(2019, 11, 27, 18, 15, 30).toISO(),
            type: 'Manual',
            description: 'transaction description',
            amount: 370000,
            tax: 0,
            taxRate: 0,
            total: 370000,
            createdBy: 'admin@luckydino.com',
          }, {
            paymentId: 3,
            transactionDate: DateTime.utc(2019, 11, 17, 18, 15, 30).toISO(),
            type: 'Manual',
            description: 'transaction description',
            amount: 270000,
            tax: 0,
            taxRate: 0,
            total: 270000,
            createdBy: 'admin@luckydino.com',
          }, {
            paymentId: 2,
            transactionDate: DateTime.utc(2019, 11, 10, 18, 15, 30).toISO(),
            type: 'Manual',
            description: 'transaction description',
            amount: 200000,
            tax: 0,
            taxRate: 0,
            total: 200000,
            createdBy: 'admin@luckydino.com',
          }, {
            paymentId: 1,
            transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            type: 'Manual',
            description: 'transaction description',
            amount: 110000,
            tax: 0,
            taxRate: 0,
            total: 110000,
            createdBy: 'admin@luckydino.com',
          }],
          totals: {
            creditAmount: 950000,
            debitAmount: 0,
            amount: 950000,
            tax: 0,
            total: 950000,
          },
          note: 'Reverse charge mechanism',
        });
      })
      .expect(200);
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

  it('can confirm invoice', async () => {
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
    await request(app)
      .post(`/api/v1/admin/affiliates/9292929/invoices`)
      .set('x-auth-token', token)
      .expect((res) => {
        invoiceId = res?.body?.data?.invoiceId;
        expect(res.body).to.deep.equal({
          data: {
            invoiceId,
            canConfirm: false,
            canMarkAsPaid: true,
          },
        });
      })
      .expect(200);
  });

  it('can create affiliate invoice attachment', async () => {
    const invoice: any = await invoiceRepository.getInvoice(pg, invoiceId);
    await request(app)
      .post(`/api/v1/admin/affiliates/9292929/invoice-attachment/${invoiceId}`)
      .set('x-auth-token', token)
      .attach('file', Buffer.from('example file content'), { filename: 'example.txt', contentType: 'multipart/form-data' })
      .expect((res) => {
        expect(res.body.data.log).to.deep.equal({
          logId: res.body.data.log.logId,
          note: `External invoice upload for ${invoice.invoiceNumber}`,
          attachments: res.body.data.log.attachments,
          createdBy: 0,
          createdAt: res.body.data.log.createdAt,
          updatedAt: res.body.data.log.updatedAt,
        });

        [attachment] = res.body.data.log.attachments;
        expect(attachment).to.contain('example.txt')
      })
      .expect(200);
  });

  it('can get affiliate invoice', async () => {
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
            ],
            totals: {
              creditAmount: 1000000,
              debitAmount: 0,
              amount: 1000000,
              tax: 180000,
              total: 1180000,
            },
            note: '',
            attachments: [attachment],
          },
        });
      })
      .expect(200);
  });
});
