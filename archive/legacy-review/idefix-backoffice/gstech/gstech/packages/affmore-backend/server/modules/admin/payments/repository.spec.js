/* @flow */
const { DateTime } = require('luxon');
const { v1: uuid } = require('uuid');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Payments Repository', () => {
  it('can get affiliate payments', async () => {
    const payments = await repository.getAffiliatePayments(pg, 3232323);
    expect(payments).to.deep.equal([
      {
        id: 4,
        affiliateId: 3232323,
        invoiceId: null,
        transactionId: 'Transaction 4',
        transactionDate: DateTime.utc(2019, 11, 27, 18, 15, 30).toJSDate(),
        month: 11,
        year: 2019,
        type: 'Manual',
        description: 'transaction description',
        amount: 370000,
        createdBy: 0,
      },
      {
        id: 3,
        affiliateId: 3232323,
        invoiceId: null,
        transactionId: 'Transaction 3',
        transactionDate: DateTime.utc(2019, 11, 17, 18, 15, 30).toJSDate(),
        month: 11,
        year: 2019,
        type: 'Manual',
        description: 'transaction description',
        amount: 270000,
        createdBy: 0,
      },
      {
        id: 2,
        affiliateId: 3232323,
        invoiceId: null,
        transactionId: 'Transaction 2',
        transactionDate: DateTime.utc(2019, 11, 10, 18, 15, 30).toJSDate(),
        month: 11,
        year: 2019,
        type: 'Manual',
        description: 'transaction description',
        amount: 200000,
        createdBy: 0,
      },
      {
        id: 1,
        affiliateId: 3232323,
        invoiceId: null,
        transactionId: 'Transaction 1',
        transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
        month: 11,
        year: 2019,
        type: 'Manual',
        description: 'transaction description',
        amount: 110000,
        createdBy: 0,
      }
    ]);
  });

  it('can get affiliate payments by date', async () => {
    const payments = await repository.getAffiliatePayments(pg, 3232323, 2019, 11);
    expect(payments).to.deep.equal([{
      id: 4,
      affiliateId: 3232323,
      invoiceId: null,
      transactionId: 'Transaction 4',
      transactionDate: DateTime.utc(2019, 11, 27, 18, 15, 30).toJSDate(),
      month: 11,
      year: 2019,
      type: 'Manual',
      description: 'transaction description',
      amount: 370000,
      createdBy: 0,
    }, {
      id: 3,
      affiliateId: 3232323,
      invoiceId: null,
      transactionId: 'Transaction 3',
      transactionDate: DateTime.utc(2019, 11, 17, 18, 15, 30).toJSDate(),
      month: 11,
      year: 2019,
      type: 'Manual',
      description: 'transaction description',
      amount: 270000,
      createdBy: 0,
    }, {
      id: 2,
      affiliateId: 3232323,
      invoiceId: null,
      transactionId: 'Transaction 2',
      transactionDate: DateTime.utc(2019, 11, 10, 18, 15, 30).toJSDate(),
      month: 11,
      year: 2019,
      type: 'Manual',
      description: 'transaction description',
      amount: 200000,
      createdBy: 0,
    }, {
      id: 1,
      affiliateId: 3232323,
      invoiceId: null,
      transactionId: 'Transaction 1',
      transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
      month: 11,
      year: 2019,
      type: 'Manual',
      description: 'transaction description',
      amount: 110000,
      createdBy: 0,
    }]);
  });

  it('can get affiliate payments by date (in past)', async () => {
    const payments = await repository.getAffiliatePayments(pg, 3232323, 2018, 11);
    expect(payments).to.deep.equal([]);
  });

  it('can create affiliate payment', async () => {
    const paymentDraft = {
      affiliateId: 100000,
      transactionId: uuid(),
      transactionDate: DateTime.utc().toJSDate(),
      month: 2,
      year: 2020,
      type: 'Commission',
      description: 'description',
      amount: 1111,
    };

    const payment = await repository.createAffiliatePayment(pg, paymentDraft, 0);
    expect(payment).to.deep.equal({
      id: payment.id,
      ...paymentDraft,
      invoiceId: null,
      transactionDate: payment.transactionDate,
      createdBy: 0,
    });
  });

  it('can get affiliates payments by date', async () => {
    const payments = await repository.getActiveAffiliatesPaymentsCount(pg, 2019, 11);
    expect(payments).to.containSubset([ {
      affiliateId: 100000,
      payments: 21,
    }]);
  });

  it('can get affiliates balance', async () => {
    const affiliatesBalance = await repository.getAffiliatesBalance(pg);
    expect(affiliatesBalance.find(a => a.affiliateId === 3232323)).to.deep.equal({ affiliateId: 3232323, balance: 950000 });
  });

  it('can get affiliate balance', async () => {
    const affiliateBalance = await repository.getAffiliateBalance(pg, 3232323);
    expect(affiliateBalance).to.deep.equal({ affiliateId: 3232323, balance: 950000 });
  });
});
