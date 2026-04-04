/* @flow */
const nock = require('nock');  
const moment = require('moment-timezone');
const ConversionRates = require('./ConversionRates');
// nock.recorder.rec();

nock('http://data.fixer.io', { encodedQueryParams: true })
  .get('/api/latest?access_key=87b5be67a9feeaa6806c161bff82d4c8&format=1')
  .reply(200, {"base":"EUR","date":"2017-08-29","rates":{"AUD":1.5111,"BGN":1.9558,"BRL":5.33,"CLP": 827.75,"PEN":3.86,"CAD":1.5037,"CHF":1.1386,"CNY":7.9467,"CZK":26.142,"DKK":7.4393,"GBP":0.92965,"HKD":9.4268,"HRK":7.4155,"HUF":305.32,"IDR":16085,"ILS":4.3135,"INR":77.134,"JPY":130.86,"KRW":1353.8,"MXN":21.52,"MYR":5.1409,"NOK":9.2915,"NZD":1.6535,"PHP":61.485,"PLN":4.2676,"RON":4.5968,"RUB":70.795,"SEK":9.5363,"SGD":1.6283,"THB":39.963,"TRY":4.147,"USD":1.2048,"ZAR":15.632}}, []);  

describe('Conversion Rates', function test(this: $npm$mocha$ContextDefinition) {
  this.timeout(30000);
  it('updates conversion rates for a day', async () => {
    await ConversionRates.update();
  });

  it('fetches current conversion rates', async () => {
    const rates = await ConversionRates.getCurrentRates();
    expect(rates.length > 0).to.equal(true);
  });

  it('fetches conversion rates for given month', async () => {
    const rates = await ConversionRates.getMonthRates(moment().subtract(1, 'month'));
    expect(rates.length > 0).to.equal(true);
  });
});
