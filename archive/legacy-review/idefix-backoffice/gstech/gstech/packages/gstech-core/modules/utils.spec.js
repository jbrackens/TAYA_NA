/* @flow */
import type { SMSProvider, SMSAction } from './constants';
import type { SMSActionsConfigurations } from './types/config';

const _ = require('lodash');
const { DateTime } = require('luxon');
const { guard, hstoreFromArray, resolveSmsConfigSet, parseDateTimeQuery } = require('./utils');

describe('Utils', () => {
  const obj: any = {
    a: {
      b: {
        c: 'value',
      },
    },
  };

  it('can get value', async () => {
    const result = guard(obj, (o) => o.a.b.c);
    expect(result).to.be.equal('value');
  });

  it('can get undefined if value not found', async () => {
    const result = guard(obj, (o) => o.a.b.d.e);
    expect(result).to.be.equal(undefined);
  });

  it('can get default if value not found', async () => {
    const result = guard(obj, (o) => o.a.b.d.e, 'default');
    expect(result).to.be.equal('default');
  });

  describe('hstoreFromArray', () => {
    it('properly creates hstore', () => {
      const properties = ['one', 'two'];

      const hstore = hstoreFromArray(properties);

      expect(hstore).to.equal('"one"=>"","two"=>""');
    });
  });

  describe('can resolve correct sms provider config', () => {
    const mockConfigs: {
      Twilio: SMSActionsConfigurations<'Twilio'>,
      Moreify: SMSActionsConfigurations<'Moreify'>,
      SmsApiCom: SMSActionsConfigurations<'SmsApiCom'>,
    } = {
      Twilio: {
        accountSid: 'accountSid',
        authToken: 'authToken',
        defaults: {
          general: { name: 'def-gen-nm', sid: 'def-gen-sid' },
          LD: { name: 'def-ld-nm', sid: 'def-ld-sid' },
        },
        actions: {
          Login: {
            general: { name: 'log-gen-nm', sid: 'log-gen-sid' },
            CJ: { name: 'log-cj-nm', sid: 'log-cj-sid' },
            LD: { name: 'log-ld-nm', sid: 'log-ld-sid' },
          },
        },
      },
      Moreify: {
        defaults: {
          general: { login: 'def-gen-lg', password: 'def-gen-pw' },
          CJ: { login: 'def-cj-lg', password: 'def-cj-pw' },
        },
      },
      SmsApiCom: {
        oauthToken: 'oauthToken-global',
        defaults: {
          general: {
            sender: 'def-gen-sdr',
            oauthToken: 'def-gen-oat',
            senderOverride: { CA: '1' },
          },
          KK: { sender: 'def-kk-sdr', oauthToken: 'def-kk-oat' },
        },
        actions: {
          Login: {
            general: {
              sender: 'log-gen-sdr',
              oauthToken: 'log-gen-oat',
              senderOverride: { CA: '1' },
            },
            KK: { sender: 'log-kk-sdr', oauthToken: 'log-kk-oat' },
          },
        },
      },
    };

    const mockResln = (
      [provider, opts = {}]: [
        provider: SMSProvider,
        opts?: { action?: SMSAction, brandId?: BrandId | 'general' },
      ],
      expected: any,
    ) => {
      const resFn = {
        Twilio: () => resolveSmsConfigSet<'Twilio'>(mockConfigs.Twilio, opts),
        Moreify: () => resolveSmsConfigSet<'Moreify'>(mockConfigs.Moreify, opts),
        SmsApiCom: () => resolveSmsConfigSet<'SmsApiCom'>(mockConfigs.SmsApiCom, opts),
      }[provider];
      const common = _.mapValues(mockConfigs, ({ defaults, actions, ...cmn }) => cmn)[provider];
      return expect(resFn()).to.deep.equal({ ...common, ...expected });
    };

    describe('Twilio', () => {
      it(`resolves config without action or brand args`, () =>
        mockResln(['Twilio'], { name: 'def-gen-nm', sid: 'def-gen-sid' }));

      it(`resolves config for Login Action`, () =>
        mockResln(['Twilio', { action: 'Login' }], { name: 'log-gen-nm', sid: 'log-gen-sid' }));

      it(`resolves config correctly when action does not exist and brand is general`, () =>
        mockResln(['Twilio', { action: 'Campa' }], { name: 'def-gen-nm', sid: 'def-gen-sid' }));

      it(`resolves config for Login Action and LD brand`, () =>
        mockResln(['Twilio', { action: 'Login', brandId: 'LD' }], {
          name: 'log-ld-nm',
          sid: 'log-ld-sid',
        }));

      it(`resolves config correctly when action does not exist`, () =>
        mockResln(['Twilio', { action: 'Campa', brandId: 'LD' }], {
          name: 'def-ld-nm',
          sid: 'def-ld-sid',
        }));

      it(`resolves config correctly when action and brandId setting does not exist`, () =>
        mockResln(['Twilio', { action: 'Campa', brandId: 'KK' }], {
          name: 'def-gen-nm',
          sid: 'def-gen-sid',
        }));
    });

    describe('Moreify', () => {
      it(`resolves config without action or brand args`, () =>
        mockResln(['Moreify'], { login: 'def-gen-lg', password: 'def-gen-pw' }));

      it(`resolves config for Login Action`, () =>
        mockResln(['Moreify', { action: 'Login' }], {
          login: 'def-gen-lg',
          password: 'def-gen-pw',
        }));

      it(`resolves config correctly when action does not exist and brand is general`, () =>
        mockResln(['Moreify', { action: 'Campa' }], {
          login: 'def-gen-lg',
          password: 'def-gen-pw',
        }));

      it(`resolves config for Login Action and LD brand`, () =>
        mockResln(['Moreify', { action: 'Login', brandId: 'LD' }], {
          login: 'def-gen-lg',
          password: 'def-gen-pw',
        }));

      it(`resolves config correctly when action does not exist`, () =>
        mockResln(['Moreify', { action: 'Campa', brandId: 'LD' }], {
          login: 'def-gen-lg',
          password: 'def-gen-pw',
        }));

      it(`resolves config correctly when brandId setting does not exist`, () =>
        mockResln(['Moreify', { action: 'Campa', brandId: 'KK' }], {
          login: 'def-gen-lg',
          password: 'def-gen-pw',
        }));
    });

    describe('SmsApiCom', () => {
      it(`resolves config without action or brand args`, () =>
        mockResln(['SmsApiCom'], {
          sender: 'def-gen-sdr',
          oauthToken: 'def-gen-oat',
          senderOverride: { CA: '1' },
        }));

      it(`resolves config for Login Action`, () =>
        mockResln(['SmsApiCom', { action: 'Login' }], {
          sender: 'log-gen-sdr',
          oauthToken: 'log-gen-oat',
          senderOverride: { CA: '1' },
        }));

      it(`resolves config correctly when action does not exist and brand is general`, () =>
        mockResln(['SmsApiCom', { action: 'Campa' }], {
          sender: 'def-gen-sdr',
          oauthToken: 'def-gen-oat',
          senderOverride: { CA: '1' },
        }));

      it(`resolves config for Login Action and KK brand`, () =>
        mockResln(['SmsApiCom', { action: 'Login', brandId: 'KK' }], {
          sender: 'log-kk-sdr',
          oauthToken: 'log-kk-oat',
        }));

      it(`resolves config correctly when action does not exist`, () =>
        mockResln(['SmsApiCom', { action: 'Campa', brandId: 'KK' }], {
          sender: 'def-kk-sdr',
          oauthToken: 'def-kk-oat',
        }));

      it(`resolves config correctly when brandId setting does not exist`, () =>
        mockResln(['SmsApiCom', { action: 'Campa', brandId: 'KK' }], {
          sender: 'def-kk-sdr',
          oauthToken: 'def-kk-oat',
        }));
    });
  });

  describe('can parse NLP datetime queries', () => {
    const refDate = new Date('2023-10-12T01:49:00.000Z');
    const dt = (s?: { [unit: DateTimeUnit]: number, ... } = {}) =>
      DateTime.fromJSDate(refDate).set(s);
    const testFn = (input: string, expected: { from: DateTime, to?: DateTime, text?: string }) => {
      const parsed = parseDateTimeQuery(input, refDate);
      const { from, to, text } = parsed
      if (expected.from) {
        expect(from, 'FROM').to.be.closeToTime(expected.from.toJSDate(), 1);
        expect(to, 'TO').to.be.closeToTime((expected?.to || dt()).toJSDate(), 1);
      }
      if (expected.text) expect(text, 'TEXT').to.be.equal(expected.text);
      else expect(text).to.be.undefined();
    };

    const tests = {
      Today: { from: dt().startOf(`day`), to: dt().endOf('day') },
      Yesterday: { from: dt({ day: 11 }).startOf('day'), to: dt({ day: 11 }).endOf('day') },
      Friday: { from: dt({ day: 6 }).startOf('day'), to: dt({ day: 6 }).endOf('day') },
      monday: { from: dt({ day: 9 }).startOf('day'), to: dt({ day: 9 }).endOf('day') },
      October: { from: dt().startOf('month'), to: dt().endOf('month') },
      september: { from: dt({ month: 9 }).startOf('month'), to: dt({ month: 9 }).endOf('month') },
      '01/06 - 10/06': {
        from: dt({ month: 1, day: 6 }).startOf('day'),
        to: dt({ day: 6 }).endOf('day'),
      },
      'september 1 to now': { from: dt({ month: 9, day: 1 }).startOf('day') },
      '01/06 11:00pm - 10/06 10am': {
        from: dt({ month: 1, day: 6, hour: 23, minute: 0 }),
        to: dt({ month: 10, day: 6, hour: 10, minute: 0 }),
      },
      '01/06': {
        from: dt({ month: 1, day: 6 }).startOf('day'),
        to: dt({ month: 1, day: 6 }).endOf('day'),
      },
      'mar 15 2021 - june 12 2022': {
        from: dt({ year: 2021, month: 3, day: 15 }).startOf('day'),
        to: dt({ year: 2022, month: 6, day: 12 }).endOf('day'),
      },
      'from Yesterday to now': { from: dt({ day: 11 }).startOf('day') },
      'monday 2:30pm to wednesday 4pm': {
        from: dt({ day: 9, hour: 14, minute: 30 }),
        to: dt({ day: 11, hour: 16, minute: 0 }),
      },
      'last thursday': { from: dt({ day: 5 }).startOf('day'), to: dt({ day: 5 }).endOf('day') },
      'last 2 years': { from: dt().startOf('day').minus({ years: 2 }) },
      'last week': {
        from: dt().minus({ weeks: 1 }).startOf('week'),
        to: dt().minus({ weeks: 1 }).endOf('week'),
      },
      'this week': { from: dt().startOf('week') },
      'this month': { from: dt().startOf('month') },
      'this year': { from: dt().startOf('year') },
      '2021': { text: '2021' },
      'october 2022': {
        from: dt({ year: 2022, month: 10 }).startOf('month'),
        to: dt({ year: 2022, month: 10 }).endOf('month'),
      },
      '22nd october 2022': {
        from: dt({ year: 2022, month: 10, day: 22 }).startOf('day'),
        to: dt({ year: 2022, month: 10, day: 22 }).endOf('day'),
      }
    };

    _.entries(tests).forEach(
      ([input, expected]) =>
        it(`parses "${input}"`, () => testFn(input, expected)),
    );
  });
});
