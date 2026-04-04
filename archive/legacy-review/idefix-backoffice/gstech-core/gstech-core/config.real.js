/* @flow */
import type { Configuration, CoreConfiguration } from './modules/types/config';

const configuration: Configuration<CoreConfiguration> = {
  publicKey: 'k3U6MgF8hXRlmGuChmMr6ZjGcjMEIK7pkdq2T4nwTWw=',
  data: {
    staticTokens: {
      CJ: 'GS[jxzrd/w/JPymVbvLEm2Fhx0UgllMIM8n2PCJjvF2OfJc1nYg9egBjgZjdjPFuUiZdXDJjrYTsOcIwlwTGE8/Lw==]',
      KK: 'GS[PLuYUU8sM/J3H+iWK4FWr83PWrIUiHc95hR94I2ZR+h4MSl3FmMbZM4Zqo0pBJn5XC26oAYFR+IANKzOHAR1YA==]',
      LD: 'GS[rB46T/XjMgyRWl4Xkx3zZ/kOHmLncqcpIazu+MNF6vWJDyDStymcQE6Idm/FuHA+XSayvV48CnviQkVlVQ==]',
      OS: 'GS[jLM0hgPxVdH4ktizTOoFBNUZ1gBFVXRBM2v/a/1/a7dr5KFGO3ssx9u8khcrzauKUknUvebDtMUneA==]',
    },
    slack: {
      hook: 'GS[F/IuUAXBJchsTaWbawobMffMXT7udcmovM7S/f7U3XjPOQka1U72g5OeCQEIM15uoWemNMbHC2b4nvuTyusZDuEND0nQY6YFF26VaEZmI+RoluoxwDO/GWhlN1+fHzPp3WdAfJ53wgm3ZpoYPrsR89rxAHTp]',
    },
    smsapicom: {
      general: {
        sender: 'SMS-Auth',
        login: 'smsauth',
        token: 'GS[WvDF9JwOBOESRbXtTYOnTUkxyC7a5edDXvIOeZyrCsMl85xCvljU762/i0li6pW04b8Wf8Zn0hu2Va5KYLG2wW3Q7gZQU1Rq]',
      },
      branded: {
        CJ: {
          sender: 'CasinoJEFE',
          login: 'jefe',
          token: 'GS[FTrSBXklJYz5poqp9X3jxh6+02GnMiS6FaXxqRG8Lu4/di7lHMBwMcHf1fmZOoXEyERv4DpAoKvamdGwKSK/BNscbSgfe6+j]',
        },
        KK: {
          sender: 'Kalevala',
          login: 'kalevala',
          token: 'GS[h8RNVTZw0iFKI4KlUwqowSsJ4KI1SwRtcUQCxSt18wO561X32qa2d14Ven5LnvxQRWAdo4G8JJ5sr4gYRDSHOe8ZkwJEaA5R]',
        },
        LD: {
          sender: 'LuckyDino',
          login: 'luckydino',
          token: 'GS[pq8h2g/xLov0aHmEinud5CUtoI1du1hj+LjxZlMSVWwr2+eTVguFv31IhVpLWN8oHYfLG3dy5+PUcrnu4JWZrRmUPjcbTYj+]',
        },
        OS: {
          sender: 'OlaSpill',
          login: 'olaspill',
          token: 'GS[s7MDtxeElVaxLZjDuO3tA6wJ1HSsdvZjkKSsgRjojDaqz3waXkR/drs6Z4S0v6RdUF7xmyGU0fQCDMkntQsiD1Nm9iiVgVpF]',
        },
      },
    },
    moreify: {
      general: {
        login: 'sms-auth8986',
        password: 'GS[DnXQwnMUIgzQU/Pi2gsDyoqKJgbNcx1sq7AS3aIyJXB1e7XlNZVtjPFgdqYaS7SKPNbd4ktrsB0=]',
      },
      branded: {
        CJ: {
          login: 'casinojefe3421',
          password: 'GS[ERNORQ2/FqRFHWgNDooiA1WaXNSzQnlEzTHjs3z7Kgu0W2tJ7TqYV4TsdHK7oRONPEMFIoaBRg4=]',
        },
        KK: {
          login: 'kalevala7766',
          password: 'GS[PMlSe1dOL2aLdf608w9dxTfuJrrelRXmRTWPwCk4+IKuU6RkoreY9iGvj+/HDlWNHsF6bligvQ4=]',
        },
        LD: {
          login: 'luckydino2662',
          password: 'GS[2tfzYxX1d0THqX75p0AGgyzthWnRqdM52yTNbH0at7X5t+2yyz52g/5hLOtEjfUSW2z3PUS8n1Q=]',
        },
        OS: {
          login: 'olaspill8742',
          password: 'GS[Rcw2dKPDhE6D6lNCPZejoNLW2AeyUYpFwSdyOaI/LdnEm3GbOXO1aFpJKNju12iNVlX6v5Gw0hE=]',
        },
      },
    },
  },
};

module.exports = configuration;
