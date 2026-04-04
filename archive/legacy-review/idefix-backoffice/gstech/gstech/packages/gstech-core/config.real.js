/* @flow */
import type { Configuration, CoreConfiguration } from './modules/types/config';

const configuration: Configuration<CoreConfiguration> = {
  publicKey:
    '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    staticTokens: {
      CJ: 'GS[cBW57UPn5IBchPqOq8oVkat/ATX5VykIQ+eAjokHw3xxk3ONsj0g2kAVo6uZlxwqp93fzv/K0t6Nov5HwGGt1g==]',
      FK: 'GS[HyVlGSO2wC4IBN91jYqdo6rSDVKebuO1qwVwstjsXjZtGY7jRmLuLZO7T3+cDQXFxaL04+S0VjruLCx2OSczgrCXMVenPhpbhlLGA8wQdqzy+Qp+dP0rKoWz9qjoWHS467MKeRSjOPL8X2NTEB4adnY=]',
      KK: 'GS[aVeJCdUwhPN8cgA0Nhjh0ql5vLVfAef6Bn0X4HmxkY6BYFCl/CYRFhcFGTWNJJYcrifyfQLAaoGsmUj5nLphUA==]',
      LD: 'GS[05BBIL/5FtNUBY6+BQGi4TSq5cCkXe1U5xepxTdCjLmYCFEMvPQbYUPERB9L6PfzfH2GXwTOEDP/dXReSw==]',
      OS: 'GS[nSuqyuAbQNtRq1f3SfMjg+zZDTXZFVfD0H0KZGmAY8HwCf3M6D7HNQy2UMgYmeY73ukHvqyl9FoGqQ==]',
      SN: 'GS[E6ccVB+vLX/XPP/rV13vfkfHIT+eTwtbEaihXLWWd5I3ECpBaN0r5t2pMhUXWnjsebj6f+ezbWhOEW6e7S97doRfGg==]',
      VB: 'GS[diX+o6EBkl1wvf5u/IM5dFnuMK5WC5FJ8NnSaPf9UOaYfNt675RWyDbsdByK4/ZL79PrAc4e+x6WwlnLxw1Pka0j9w==]',
    },
    slack: {
      hook: 'GS[4obOfk8PvLo5fXTQ5N8/BWHRLQGj9hvZ+1xOql+yt1LKhf2rwvRq9feLOYIfJ0vQRQhjoyKwJhPf4TZIu3DptGj2YCJLWo9yzHm4eCVFtKZjBV4raKhWb5RPd+Uu1r4WSVXfWy/x2vQOJzcEe/c5uORygdVYROk=]',
    },
    smsapicom: {
      oauthToken:
        'GS[h4uIPDhoeIdiEXW4uJp1JYPkX/erLIKAKO3A4MsU+Wwg139W/Hd4+F/YdNYYVFJAx5oVTPljEUP38fFhFq1v0JyuSDmbK5GPt3MkzkJGqBI=]',
      defaults: {
        general: {
          sender: 'SMSAuth',
          oauthToken:
            'GS[TaoNLDu++cEUwlC+wBpQI6M/Oy2Ne03DMh3T5lmmMa7JphEmVEy59Hg/UppBHMHasywhbmi2QbRkmXefLPH11jqSLr1g4VTh3degICViBmY=]',
          senderOverride: { CA: '12044106485' },
        },
        CJ: {
          sender: 'CasinoJEFE',
          oauthToken:
            'GS[lMpH+Vbgt2TvE4TUrSXgF+4zZhwfdgcs94CCXHFgJnTfeDcLMGl9pfej4YS5Y/eORUN64sxFdDt3JFtPEaczDflVmTH4pQ+qxSZqfC407sk=]',
        },
        KK: {
          sender: 'JustWOW',
          oauthToken:
            'GS[3eccOo8YduRN/1KPfN7acf69LYUXtIm94lNiYeVYdI2MIgMG2cM8d9R4bvBog6LWSIYa+RWLmjy+ck4Mc6ukrv/7h7zFm47AwUEeCZGtKcc=]',
        },
        LD: {
          sender: 'LuckyDino',
          oauthToken:
            'GS[S02pmSiTg6vz7IqszBCrHkL3l3HVtbqkB5L7IxCA+McKvll/7IGy4EOg139iSHYzoc4O32hcjWg7vSU36fQM7YTH9qV13Nnn7KwcsJ6bMX8=]',
        },
        OS: {
          sender: 'OlaSpill',
          oauthToken:
            'GS[pyBUOfvkQJvAErjLS8cAp+ZM+Xzg8Cp2mygHRIJYki9NBbkriSqc7PIBTxf9cc+9arJ2EECh9TnrWAlZBKdfftIGVUZWRfFR+G2VbusZF6k=]',
        },
        FK: {
          sender: 'HipSpin',
          oauthToken:
            'GS[Wpq2g7QLyaKn0CGo2B6zJErx2h2sXufwYfEiBaURpVAuhKadDY9VDdYqJHdGEKR12/PWIR4dVZb9xG1tvO8WqG0F4bVwH2Q/lzT6EQWwCkA=]',
        },
        SN: {
          sender: 'FreshSpins',
          oauthToken:
            'GS[VaG6aMaRwhRpB8iaqyBd9Kyo1CsplgQ6g6DwSGTeXthiwNHEdorNu4PlNtnMmqUYhLjJO+7jQuhUKUMENQ3oSjVRVSnx6C9eulalMiSU7jQ=]',
        },
        VB: {
          sender: 'Vie',
          oauthToken:
            'GS[hVqGHsC96nlvr1SUEuHE2HIbbfghU7JK6DWgwvqL1Q+SGd4XJ0rWjPkrREHQ/ZBQ8VNpkgbOpbXlNUYKoVDbz36Fmh/gt5RAVb/qFOHMjTI=]',
        },
      },
    },
    moreify: {
      defaults: {
        general: {
          login: 'smsauth3189',
          password:
            'GS[rhbCLaOUIRSVujk77YYXNGiBVGp8/JLECZNdlxRwfSkGLtiVL/5YGmUaeVsdCkNGjM3vd0GvDZQ=]',
        },
        CJ: {
          login: 'jefe9569',
          password:
            'GS[tCdRDKEGuAyX30YA7NIXKesOIxLJCw1yZQfmFCiIe/MODtm4L5CtsBYY/ei5lS6DOSHM8Vkj+0k=]',
        },
        KK: {
          login: 'kalevala6477',
          password: 'GS[p/ttaLWYT3orWTRluvmsbnI7o25NmwjjeCrz8UU6Np3gZy4fp3UbPc/9emIFIGgUODE=]',
        },
        LD: {
          login: 'luckydino1492',
          password:
            'GS[DEpWycYnEZXAugjJNDHwi4N7ObNK8GkVP5dFtwK9BosH9W2wRpJu5fBiLJNLi//5wpoBVQ2oxb0=]',
        },
        OS: {
          login: 'olaspill3260',
          password:
            'GS[WOpC/6HFt/cM8E5YvxcF0xSgK79vPZdVjO9qV5gRlff7VWAg++EKkiUnFru2YPGUnX9kpzHPKjc=]',
        },
      },
    },
    sendGrid: {
      token:
        'GS[DsDNgHQMMnahZt+sP4v8Ast6YaAovKDlURsMSleQilNrWhyqZPdQWFHr8JZO3k8PRBoZNH5ieyL7+Ir2DLRMpchrVu+ycrPlp9C9FtR4D5TjTAe/YAsWjb37ZbxMPdGcFCVWITL0/FwvktV9tw==]',
    },
    twilio: {
      accountSid:
        'GS[Ses6EVQTDon/VQd1vgizm8krTWRBdGIoxcSedwkpqGPLwTDGLjQ7YjvCuvmHCp4l2gvVUmqKo3OGyxwZIFOPoekbWUFZrrmAzvA=]',
      authToken:
        'GS[mt5HMlM+mFl3PU2TqNxNa7UQROXwj/T73+se0HlliLXI2yt+MnK3UArF1QWQihO0FN4ibuTAnapsOL0/gCi7D9+MBmvcPmFH]',
      defaults: {
        general: {
          name: 'SMSAuth',
          sid: 'GS[tyHWUDPtLbVgEUW7BOj4eaO3lDquc4mbOrPEZgdMbQ619gYXePIBIz4/GpqWoaE7o+oiVHMod8tc90ZIYsCGJaHG/i+oI3nF1qA=]',
        },
        LD: {
          name: 'LuckyDino',
          sid: 'GS[3EzLBz/QhcNqLqXjsQQSOXqKVmtl039xMIj2+28e1vOiOdP98L1kbsPRtaBSY3Y/6fSCQL8YCdO5a2pjVqr2OAz08pYBI5iZvAU=]',
        },
        CJ: {
          name: 'CasinoJEFE',
          sid: 'GS[Lsl8FSEG3vcyX5rIQKuFXNaYCQpuKoCYhn27pMM5M+ZwDjzITdYbtf42FOiTQ94n7MkjeX2hlzzumH5aOB2e7K/TT6JURtMeRcc=]',
        },
        KK: {
          name: 'JustWOW',
          sid: 'GS[vKMGjGlOL3xVG3cMQFAusEb3kyHDdgUvtq+R2ZOICTCvL4kU4swKU1vXAdbKInVeTjmJm749F77Blsm+QOXE0JIHdC3yyWOlUr0=]',
        },
        OS: {
          name: 'OlaSpill',
          sid: 'GS[amYt5VefTv4Om1ChjigIptWab9lat75Z76febnEjsGkWKuuPivRccbQbF0cDSQACt5v0n1TVZhcQYB15SA0Jvj/LVO9yJZ4hgR4=]',
        },
        FK: {
          name: 'HipSpin',
          sid: 'GS[8xCqusEW5Y4jJ2iOO7xey7JR8XHpt2R+4Slj2NbD76L8BqH+q0lCSY0BKbGUjzLeimGH+s/cxwKf1zP0xB2xItzFGH4yIubh670=]',
        },
        SN: {
          name: 'FreshSpins',
          sid: 'GS[sadZs7pPdAIlIQlDevz5QRh1LMRW2qJEzKFrmuiW9JccpiCnJgi9o9fIAY6j+NVMG6j9Tw+YqMvsZjlJyDRWWxIi3pEo6uZSY7s=]',
        },
        VB: {
          name: 'Vie',
          sid: 'GS[WYFDkvt9HaB4MRQBOYwzO9WjIID9KDopg0ozoxtao/q/c6S2rriN4s5WN7HgiJ4fMo+4UxUPTJDbCXFWf/5+NKMv2moD0yQGSeI=]',
        },
      },
    },
  },
};

module.exports = configuration;
