/* @flow */
import type { Configuration, CoreConfiguration } from './modules/types/config';

const configuration: Configuration<CoreConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    staticTokens: {
      CJ: 'GS[Otg/Jx0Gpzh/DIiIaZKCWsxFeTRcm+nZfe0HRmOdds4Uco0/Q/4u7WflVbuG3T8NrA==]',
      FK: 'GS[DSEZnQt/iFLcGMCD6HeSd60tFFKh5UzEEFBtu+9Li4vMjeL9rsytWRSt9tWg0Q9WX9ujpHbQEDQ5b4pxSOzaoLfvXtE400jaTlW93OUm]',
      KK: 'GS[dzs9xanr6Xk2tdLfg+IAbRirKeKS9t02mcSSFnvEqkEzl1Vl8RNnXWGKXdeATOYFIg==]',
      LD: 'GS[Pou7iRb+spwYqIvmBjjB/LiwvffOBORK+xSk0qV3DaQt7DJ99z2lTMUmWlxmxA87+A==]',
      OS: 'GS[Le6pzG57U+bOuj2lnLZcWyisV7Smql+skLFCKjnGXwTnw0+fsUVUsLWisBwZnxCI9g==]',
      SN: 'GS[+CUxaZqAF1Jn8GDElaCCUmwtSywXZVE0XgmDxQzejxkBWoA1Oehl1mKbBeUC+iurIu0tcZTNG9qcbSbvKLE/O/r9fA==]',
      VB: 'GS[wPXMA8kuYCFRrzQO3HzOCGZQOUV/Y7+/YyWa8d8agz1JZ3+p4D0MdYOOIQoiyPEkf/oUaKVt/g36IRGdbSd3gM+4SQ==]',
    },
    slack: {
      hook: 'https://hooks.slack.com/services/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',
    },
    smsapicom: {
      oauthToken:
        'GS[4TBVAgP06uetkcNrKVXnL7ehGZ5B5ePdB/j5S6Qeh+JPCqkYhrqlVOv+Hu87skxfLHiHTdUOwrwCzY78/ZwQ2puexPIPxHsXH0UJSVWutSM=]',
      defaults: {
        general: { sender: 'SMSAuth', oauthToken: '', senderOverride: { CA: '1' } },
        CJ: { sender: 'CasinoJEFE', oauthToken: '' },
        KK: { sender: 'JustWOW', oauthToken: '' },
        LD: { sender: 'LuckyDino', oauthToken: '' },
        OS: { sender: 'OlaSpill', oauthToken: '' },
        FK: { sender: 'HipSpin', oauthToken: '' },
        SN: { sender: 'FreshSpins', oauthToken: '' },
        VB: { sender: 'Vie', oauthToken: '' },
      },
    },
    moreify: {
      defaults: {
        general: { login: '', password: '' },
        CJ: { login: '', password: '' },
        KK: { login: '', password: '' },
        LD: { login: '', password: '' },
        OS: { login: '', password: '' },
      },
    },
    sendGrid: {
      token: '',
    },
    twilio: {
      accountSid:
        'GS[0vbqU8k/KaToZTnm6X2Mexmo2rWQK1OPwfrgxYkSfqjkLCyHqYrJcTifGj6JAPUKtkG0+OA6kyq+7U6L5ruoi7EIKJRwRemPhPg=]',
      authToken:
        'GS[xsdqEkB5EsiFcJ65GncxtK7ENRd3JQiizsJMhc8KwPLjkKrox0rtsyXlmAM1EBfTDKXR1IYR2vhKyG9q+WNGzI7nRvfxZiZt]',
      defaults: {
        general: {
          name: 'SMSAuth',
          sid: 'GS[fLaq6D206EEOVf6odjdjuE2A8EGKy26I/jFy5/vdJPq19qclcmulv39tFJ6X/OFfYTwJUDOlardzCUJ/I1NIddUzeEUY1AWczqM=]',
        },
        LD: { name: 'LuckyDino', sid: '' },
        CJ: { name: 'CasinoJEFE', sid: '' },
        KK: { name: 'JustWOW', sid: '' },
        OS: { name: 'OlaSpill', sid: '' },
        FK: { name: 'HipSpin', sid: '' },
        SN: { name: 'FreshSpins', sid: '' },
        VB: { name: 'Vie', sid: '' },
      },
    },
  },
};

module.exports = configuration;
