/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { PaymentProvidersConfiguration } from './server/types';

const configuration: Configuration<PaymentProvidersConfiguration> = {
  publicKey:
    '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    providers: {
      euteller: {
        identifyApi: 'https://auth.euteller.net',
        paymentApi: 'https://payment.euteller.net',
        deposit: {
          username: 'LuckyDinoEEM',
          password:
            'GS[6dEKu+Q+cDINwJljt91G1764HhM+QeLJAzjtSp/OOjmcEJXcv1fah8zFKB0+KVdJMh7o6iuoRO3JQ8PmeNA=]',
        },
        withdraw: {
          username: 'LuckyDinoEEM',
          password:
            'GS[MWma1UIEMo2tdptmlBIzO84dqegVwhl3eEYlxLAFlksaVzkpkMQL7H4nYGIUIktIP6LgMlYGJH+RjMAdxjI=]',
        },
        merchant: {
          username: 'LuckyDinoEEM',
          password:
            'GS[LuU1U84sWgaNY832MrNzOK0HnT+OlRJcSe/C31dLZTej7UNED3aBgWmn9gBt1Se5FWkIJWMSts7Cwv8SuXs=]',
        },
      },
      paymentiq: {
        password:
          'GS[MTb0dc5TcAqkRa5ioFf+4J44kUcUJzk+vAX5a/z8GaSQDKwvKb/e0bAJNq+N4QvPlMAlFd9rBw==]',
        brands: {
          LD: {
            merchantId: '100011001',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
          CJ: {
            merchantId: '100011002',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
          KK: {
            merchantId: '100011003',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
          OS: {
            merchantId: '100011004',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
          VB: {
            merchantId: '100011005',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
          SN: {
            merchantId: '100011006',
            apiUrl: 'https://api.paymentiq.io/paymentiq/api',
          },
        },
      },
      zimpler: {
        brands: {
          LD: {
            merchantId: 'luckydino-disabled',
            apiKey:
              'GS[7NtZ8ED1OsLIkZ569g2d+WiHDiXjRLEPvkk+QDPJd9BBEbkiRvz1udk7yHjuwEgqEudJ5LYKbFJEU+mEII7ZSrd2Tz4AuXFJq1vONg==]',
            apiUrl: 'https://api.zimpler.net',
            scriptLocation: 'https://api.zimpler.net/assets/v3/zimpler.js',
            url: 'luckydino.com',
          },
          CJ: {
            merchantId: 'casinojefe-disabled',
            apiKey:
              'GS[bPjnfieLnYquHF2dIL1y5Ky6Qcd4LRl85PPembaxfQzSleVs3ChvX2X8AKn+QJkgcVmSLuPNe146eU6J4dVfZQX9GcDwmvEPB+s+7Q==]',
            apiUrl: 'https://api.zimpler.net',
            scriptLocation: 'https://api.zimpler.net/assets/v3/zimpler.js',
            url: 'casinojefe.com',
          },
          KK: {
            merchantId: 'kalevala-disabled',
            apiKey:
              'GS[4sE6lfObZpHi/zj/YiZTX0lEMbQn7tqqEodmWq/hdlGbNAUI4AnYv+Qvb+CXzwrGKvafVU3m27ac+6JagTYYdPix7TfECjaC8syV+Q==]',
            apiUrl: 'https://api.zimpler.net',
            scriptLocation: 'https://api.zimpler.net/assets/v3/zimpler.js',
            url: 'justwow.com',
          },
          OS: {
            merchantId: 'olaspill-disabled',
            apiKey: '',
            apiUrl: 'https://api.zimpler.net',
            scriptLocation: 'https://api.zimpler.net/assets/v3/zimpler.js',
            url: 'olaspill.com',
          },
        },
      },
      skrill: {
        gatewayURL: 'https://pay.skrill.com',
        paymentGatewayURL: 'https://www.skrill.com/app/pay.pl',
        apiURL: 'https://api.skrill.com',
        merchantId: '157404813',
        account: 'chargeback@luckydino.com',
        secret:
          'GS[NfK6I2QkiSyvJXxl2e+f1aoaRqHQVQO5w5tY+GC2GjU3Y6N5Y2xUOmkkDQAdwnM+SbKMcsRutrAqY2+MgCTXtw==]',
        password:
          'GS[kgIYR1tAW/WDYbVDsYpEqih6KDNvldOVAeThKMdBENEYORlN+IrSLH+zuc2OCSsSugnOIohAO8PybYWkLg==]',
      },
      siru: {
        brands: {
          CJ: {
            site: 'jefe',
            endpoint: 'https://payment.sirumobile.com',
            countries: {
              FI: {
                secret:
                  'GS[dikbiGtDGcWm/QFo6395H+T1Vv7JYM9CwBVquwkuuG0e4fwAJ1ZIQCL6l6QgOFFcLtJ1laUi5JmzOLpxtWfU66h1Ob2+WhThQaY8cSBvGkg=]',
                merchantId: 94,
              },
              SE: {
                secret:
                  'GS[0xwiJWl8lEUEL6VItDKDEqakehnZOKJbP4MrW0qQI7/cEjVMxU29JB4T8XbYWAyvWmPiZvQ7x3f45LUyHk8wHRFsvnevdwNeqZwlaPDKTJs=]',
                merchantId: 96,
              },
              NO: {
                secret:
                  'GS[KX9UIkghwUX1nP4UxtAT+W2xsRZ1iey8pUTHNoqlLu6tcIpT8BfRnCJIZgjfnlRKWx2ZTcKRNyxxXSFunTV5DC5xZ6DzX5Ks9XsS6Wns92I=]',
                merchantId: 99,
              },
            },
          },
          KK: {
            site: 'kalevala',
            endpoint: 'https://payment.sirumobile.com',
            countries: {
              FI: {
                secret:
                  'GS[9bZx8vB1vWf1E5aaegWu/d91jw3F1dOb3JRxUa3An+OUbHy9Kw2SZieJ3CZ7IYixe3kDDoq6nYCpqdzlNY8aZj0au1aNRcTZywBcM2jhoxA=]',
                merchantId: 94,
              },
              SE: {
                secret:
                  'GS[7fh1Bouh1ZDv/u+UW5PS3fHLIDA9gY7q6oEMcGZ8UfuIc9j9piZ4xOEjwuOEw3GSrDMGCgqnnKQAA2132NTT/u0b3SjL907pzRPQ8lZhbV4=]',
                merchantId: 96,
              },
              NO: {
                secret:
                  'GS[WkrtA/fwn8HPMrf2NCgYwBs0Wn6RIYskm5Rk3puAaoRNcSNxu3+zKkxhrursJ9k84+Jcf0ubqk0qyyFAwhO5FEXLGx676wgkJd+5u2uDaFI=]',
                merchantId: 99,
              },
            },
          },
          LD: {
            site: 'luckydino',
            endpoint: 'https://payment.sirumobile.com',
            countries: {
              FI: {
                secret:
                  'GS[uUfRrUvgZrNIpfQvakkz5LvZYzDc/PdNnB+5PZb7E1uU5YTVM6fhE+XeawHJh+f1zd3IHt4pyVpDbT3yGNrN9x5vgxhiwmId89MvvlbBQ4k=]',
                merchantId: 94,
              },
              SE: {
                secret:
                  'GS[eyJB4dGm5d67bFrFFOEMPlINM2beMrx+HwrbjG41Tnn5Mw75Lg0rF1DWR05AseylSZx9Eit1hrcpp4GYC7gzm3EdFgQUi9LzgePvVIpVNGs=]',
                merchantId: 96,
              },
              NO: {
                secret:
                  'GS[c9FjSQL39n8j9RVNwM9uaiQ01o0sRNSdUuOpr2K7efcPZCvlHj2CfaTFF8BXJYwJBdYBVbNBjHxmto+nWRqFMc+JQMqFIOR5qpbSk7/9WJk=]',
                merchantId: 99,
              },
            },
          },
          OS: {
            site: 'olaspill',
            endpoint: 'https://payment.sirumobile.com',
            countries: {
              FI: {
                secret:
                  'GS[7Btn9Foo1B+DRtNccGXlOfiFK0uxyt6/yOaGd7VBin25QqGeVewHfnwJIRksSj7Fei3FGWAfQAmB6hEww0FDVHE/z4dB6DK2Vc6icxbOzSk=]',
                merchantId: 94,
              },
              SE: {
                secret:
                  'GS[VtrpLzAuwq7EyEcZsv+nmxmzTZEQeLvKsMMeP4NNzo6mKXAdy4tam7kW0mPWAC+N6uwy9/L3xiJOGn3jrRkSlAAe0cHMkC/UwKY96zLQDXc=]',
                merchantId: 96,
              },
              NO: {
                secret:
                  'GS[GeyQ9KkqLZ1QdjwoN7II0JcRJ4vZU+9pcgffEELY2OU3mSzVWGNMKwOvIBUlOc3DWke4kqKqWQUSWQSIUfvVup5jpg+RERmMO9RRH+0o68g=]',
                merchantId: 99,
              },
            },
          },
        },
      },
      neteller: {
        paysafe: {
          endpoint: 'https://api.paysafe.com',
          clientId: 'pmle-302762',
          clientSecret:
            'GS[DYDc4/GSWEKVUWe45w1ARG11YXi0YtYeUE2vV8Wmcd8yh9lidiGq9sEwV76XT10qRCscbYlsDnzS0gN/0XIBVfqvNEHZHC0jrScgsmX/cqWzKTBUlTXkigDuCbGHj9nyMHLvt8vqEdu5fhdXSMLoB2h6uAnmw+plFfkr/oC2ce7CVFNx3pdCwPEth/vrrnA/8iXfCQNg]',
        },
        neteller: {
          endpoint: 'https://api.neteller.com',
          clientId:
            'GS[XaGFrPhe+0QGoCcogkViYN44i3bx0PU94BhCP3LCZ/2k33vqQvImT2vk/bIgvpBm6ygKMnnzixYQPhZR+al/2TD+spRcPvz3hLAzZQ==]',
          clientSecret:
            'GS[NZVmtRBWXi/Nx2TSozsNcTPjI2HZRB44h6UTkUz2LqeY6a68B/grKa4nvrGGJPzOK39H63B7z9uaKmeqyaQbAjNkgpSHRzSACiNnQw==]',
        },
      },
      trustly: {
        accounts: {
          standard: {
            username: 'esportent',
            password:
              'GS[f42Xh09gEvhnl0BbUCGVrJzsguGJu3Cxx7yWlRm4CDdgvjoGLBRRH3mUmFTqoooTO7hcWHBU0kjZkYgR87arOxy+H65riEiS6IuYCg==]',
          },
          pnp: {
            username: 'esport_pnp',
            password:
              'GS[qWFvHEjWIZAEkhYKNlOUPBfMw+PG3IenDXuFzGzkRQ/r3U0yqixAfjvgGgA9aKsX/yuaiVXD82wu1avaPSZo00aChOuBmJaUOkCKCw==]',
          },
          bank: {
            username: 'disabled-luckydino_bb_fi',
            password:
              'GS[R2+sTlvmVG+do3TK3bEa3jD6WIH6KUzJk4dPcZCl9N+tYyIiOkI0ynKEngVcI96mQnKKJzCdwdFUErOQevuZlyp/b1pDjguXmL5Cxw==]',
          },
        },
        brandsAccounts: {
          FK: 'pnp',
        },
        privateKey:
          'GS[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]',
      },
      emp: {
        apiUrl: '',
        apiKey: '',
      },
      jeton: {
        endpoint: 'https://walletapi.jeton.com',
        brands: {
          LD: {
            apiKey:
              'disabled-GS[koybmc0N7TPZLlkDduNrylDE3PtOUVpvceRlUZ/s2zs+LSaCCwIJgJf8H3uW8535zWoHGUj7pN/bfGiPR+qO8uaQqcXTyZSK]',
          },
          CJ: {
            apiKey:
              'disabled-GS[gdjCf1b3i7dpy8lmFhkbD/2QCCz85P8VjmUq5J7ncBbsGoPnb9U5OXk5gYjDjLxlFBZP8HToDLG97O7PpXrbCTfkOw8jcdhG]',
          },
          OS: {
            apiKey:
              'disabled-GS[QGGxhU6WVX47TPwmnsmT1L1qr4VfeEJ5ez+/7SeV2ckPG9Q3FbaU+M5YsCWBwIyzse5E0n6PE0MvAf60E4IBGR+yIJagpYqF]',
          },
        },
      },
      muchbetter: {
        walletHost: 'w.api.muchbetter.com',
        walletPort: 443,
        authorizationToken:
          'GS[RVamvalmk3zE7L8j516h/vj2F8kbsfIIZga2ANyKYr/IRPPiCqLHThOKFbe6AcWonVV2ntER6R3mx8w2GtgEHy2SnBNT/Pquk+qoRTMLiDOvlIp9]',
        merchantAccountId: '1154240',
        signupLink: 'https://a.api.muchbetter.com/merchant/user?trackingCode=RXMxMTU0MjQw',
      },
      worldpay: {
        merchantCode: 'disabled-LUCKYDINOEUR',
        username: 'B1FBKBRNCAEJ6OHPOPCZ',
        password:
          'GS[YDDeyAlrAROE2EZT372wexZDaQctmTfGCDL8JcWQM6QnIZrAgvb4um6H7sC5InZ6Q8lGlEOLP9Z1zCGbXL1J0Q==]',
        secret:
          'GS[56GFsS1dKzWdBWlHyI5Nazs87HPeldt0HSwdHVL97hqr54cDixQiVj79MyAvDJpjyF71sRBqZfn3xqBVp2lO]',
        url: 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp',
        installationId: '1185377',
        withdraw: {
          merchantCode: 'disabled-LUCKYDINOEUROCT',
          username: '8SA144CA9IFMM4NLTWWR',
          password:
            'GS[aMWak58VFuKWBbj4QF3xqSXLSwc1KHPNcEib70761f/NKoKIQF1vBVxy3wS/KCiaogSO2I3ZZE30xlf4uXMBxg==]',
        },
      },
      qpay: {
        url: 'https://pg.qpay.live/agcore/qpayLive',
        meId: 'disabled-202011030002',
        distributorId: 'DIST0011712019',
        agId: 'qpay',
        aesKey:
          'GS[m/PSF0kF5cGADP9mwVBkBpsDlcPuKO06J/jtCfZKjZSmV9Jgofh/Ejh/8sOUlE5NlkNCw1pmQg6/EX7qeegO39TO9EmPiOBAcM8mTHBEAvD+/W8S]',
        defaultAesKey: '',
        aesIV: '0123456789abcdef',
        withdrawals: {
          url: 'https://payout.qpay.live/agWalletAPI/v2/agg',
        },
      },
      veriff: {
        apiUrl: 'https://stationapi.veriff.com/v1',
        apiToken:
          'GS[LvIELX5++PzRtCEXEW32UFwMv6KEluNaAZubGfGV+ekxhyq5W8Bmjw6y/TgJkl+8Iv7vm39pZlRdPNbGj9aDh7Uns74YWylgCfZYwQ==]',
        apiSecret:
          'GS[IOFqSuDyY/aYgHBMcsLN5UCasQlecPIWiDkC+NagVIIAnmb/uJqnA5DJQGiOachjrBFD3Sm2xXdGJM+nRKXvxRAY7bORhEE6wu4SvA==]',
      },
      neosurf: {
        apiUrl: 'https://pay.neosurf.com',
        merchantId: '24842',
        secret:
          'GS[7S651N/l9LKA0YXlGyPnzORaOwNFBt1dBqtkRO3lHEB02W43yXNn060YWCTOUddUZrWnLldECjGdjvit1st+L2VoxbuqEAZr]',
      },
      luqapay: {
        CJ: {
          apiUrl: 'https://wallet.luqapay.com',
          apiKey:
            'GS[Boh7DeGOSVPCHqlGbKdi6KlCS41CT+EHDVSlt+jfVMfeIvHQG3oJqN47vGeX4/n21lC84iBUi25WAiO2RqnKyERq0ea56HY7]',
          secret:
            'GS[WW/wm90KQLePKSzEd/yHGoToiQRamuqW8My3dQiGiDJlPPpcwdmUbMEUyrFbhbZb12+9RJgh6JhMz1WD1aBueS6PGx3TeqXU]',
        },
        KK: {
          apiUrl: '',
          apiKey: '',
          secret: '',
        },
        LD: {
          apiUrl: 'https://wallet.luqapay.com',
          apiKey:
            'GS[yHXYqocdVmOzpyo0TdADxrpeXMhwiRkO417nYVvcAAiFmJdB6HtniRm3uNw3yv/TTo1r8BkSMHolWDs79uqS1dd34olfMc0J]',
          secret:
            'GS[jaYoKo1NUzQWAe00SM1fcAWJIBId5GRK2bwUCErV8RblOkLvpAUTLYe4iW+HRAcDrroUBQGRBy0gmGIyxlSVjHIEu6LsW6DA]',
        },
        OS: {
          apiUrl: 'https://wallet.luqapay.com',
          apiKey:
            'GS[axFZqxnJQoxLH3Yzdn/36qHLq1z1aQqKHriq9ag3c5UHwwP5cbXy+mdZWZzQmzdbBbvlQJa4V5JvuNsD55iU4n9mY+dGMqlx]',
          secret:
            'GS[rLcsxXJDebSfrYWflhMBzCgQjmtiizh4JqID1DrjXUdD9VtA5uMcq0iFaNirmk4mb4XyVjV2ZuJ6HK94bbM/vTaWbwzRZKLv]',
        },
      },
      brite: {
        FK: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[NxjlThkgRtFVtwYVI24HnVgT3Ve5Sq7KNdAR9HgS4WHe0ewgSJQ5uF93CTuUYoHuLOJswKHxXg+8PltuHhb9rUOKFsfp48jH0KBEzkTW1AVyEfJsdR5Y2VizKA==]',
          secret:
            'GS[rfzGSrC6sWO8wX6UJwCBUBKQby/1+EQI6mfPkXk7EY+IaJTXL8YzErcWhb6F7PEEjhLpzHsuUkWD9TtvHUJQebV2eCPC9EleG/VD47sO/ns=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgKi_sasJDA',
        },
        VB: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[NxjlThkgRtFVtwYVI24HnVgT3Ve5Sq7KNdAR9HgS4WHe0ewgSJQ5uF93CTuUYoHuLOJswKHxXg+8PltuHhb9rUOKFsfp48jH0KBEzkTW1AVyEfJsdR5Y2VizKA==]',
          secret:
            'GS[rfzGSrC6sWO8wX6UJwCBUBKQby/1+EQI6mfPkXk7EY+IaJTXL8YzErcWhb6F7PEEjhLpzHsuUkWD9TtvHUJQebV2eCPC9EleG/VD47sO/ns=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgKi_sasJDA',
        },
        SN: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[NxjlThkgRtFVtwYVI24HnVgT3Ve5Sq7KNdAR9HgS4WHe0ewgSJQ5uF93CTuUYoHuLOJswKHxXg+8PltuHhb9rUOKFsfp48jH0KBEzkTW1AVyEfJsdR5Y2VizKA==]',
          secret:
            'GS[rfzGSrC6sWO8wX6UJwCBUBKQby/1+EQI6mfPkXk7EY+IaJTXL8YzErcWhb6F7PEEjhLpzHsuUkWD9TtvHUJQebV2eCPC9EleG/VD47sO/ns=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgKi_sasJDA',
        },
        LD: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[bZ2ZglBZsXR5BJ78L1sTlppK4zsfOGbGlPRCyvvOR3H2h+/4f96BrYSlwh2G3DTJUeaWjMXvn2eV2BkbyCOxxGUHs9jGDhJA/mRDnqLv8QMsRw1rHCAvlfgUDQ==]',
          secret:
            'GS[aiE/hFBptpsVKCtWjpwnTeFzLEiosozoE6HGbiuOI78Bj2Sf15XiUkowa6Tv2u+Xafho7RDvOP6yKNQMFoKDKZW1KJ9qKpZASvJ/00fHuhw=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgMjBgKsIDA',
        },
        CJ: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[bZ2ZglBZsXR5BJ78L1sTlppK4zsfOGbGlPRCyvvOR3H2h+/4f96BrYSlwh2G3DTJUeaWjMXvn2eV2BkbyCOxxGUHs9jGDhJA/mRDnqLv8QMsRw1rHCAvlfgUDQ==]',
          secret:
            'GS[aiE/hFBptpsVKCtWjpwnTeFzLEiosozoE6HGbiuOI78Bj2Sf15XiUkowa6Tv2u+Xafho7RDvOP6yKNQMFoKDKZW1KJ9qKpZASvJ/00fHuhw=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgMjBgKsIDA',
        },
        KK: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[bZ2ZglBZsXR5BJ78L1sTlppK4zsfOGbGlPRCyvvOR3H2h+/4f96BrYSlwh2G3DTJUeaWjMXvn2eV2BkbyCOxxGUHs9jGDhJA/mRDnqLv8QMsRw1rHCAvlfgUDQ==]',
          secret:
            'GS[aiE/hFBptpsVKCtWjpwnTeFzLEiosozoE6HGbiuOI78Bj2Sf15XiUkowa6Tv2u+Xafho7RDvOP6yKNQMFoKDKZW1KJ9qKpZASvJ/00fHuhw=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgMjBgKsIDA',
        },
        OS: {
          apiUrl: 'https://production.britepaymentgroup.com/api',
          publicKey:
            'GS[bZ2ZglBZsXR5BJ78L1sTlppK4zsfOGbGlPRCyvvOR3H2h+/4f96BrYSlwh2G3DTJUeaWjMXvn2eV2BkbyCOxxGUHs9jGDhJA/mRDnqLv8QMsRw1rHCAvlfgUDQ==]',
          secret:
            'GS[aiE/hFBptpsVKCtWjpwnTeFzLEiosozoE6HGbiuOI78Bj2Sf15XiUkowa6Tv2u+Xafho7RDvOP6yKNQMFoKDKZW1KJ9qKpZASvJ/00fHuhw=]',
          merchantId: 'ag9ofmFib25lYS0yNDkwMTRyFQsSCE1lcmNoYW50GICAgMjBgKsIDA',
        },
      },
      isignthis: {
        merchantId: 'esportsent_payout',
        apiUrl: 'https://api.payout.isx.money',
        domain: 'prod.esportsentertainment.payout',
        subdomain: 'prod.esportsentertainment.payout-apiKey-EsportsEntertainmentMalta',
        senderIban: 'CY02904000010000100218201001',
        hmacSecret:
          'GS[yFha/u0uiEQ+Rq4ii7FIrJ/FjNomr3xuUhcSY/LwR+ALsIwAha3fWoKHrGX/71rGbLAKeGtfP7KRwBbl]',
        publicKey:
          'GS[BpIf1y5ZiFSbnbf30874NHEB32VcgncFKRShXGARBnTjPQtf8ZudObj9pmj5yFhcFs4OmAn3kyr/V' +
          'BwinoOCuPHvD1v0tFXv6+CDnIxnQXfSPh/AWwrz98wzUtbAKxrbb8d5gwwyKn66kFN9aGPNuPLSgVAip' +
          'RTxJJYfJLcMQgTO+pQgTwuhoLpR9o/YU/aYgwuCdjRGzXJbXv9RL10DXAujSO1MokWeGRddi+5Hs3p1Y' +
          'bmgNDKPQVVNFsjpdpcca4qmLdaMUIqbPIXS5sUxeTG6JiG1nK347acOhlFLAu5pTsorT1MRq7xShKnAK' +
          'PCZ+5Wx3O6NbVPh25PPB8nCDbsDNj1PIj29iWguHr6yWeavUXhZ3sMS91ShVGGdC+8qQZHauCYdNjmG9' +
          'Sx+wef6rEzIEkNA5dUoytszcgXXGJywzaJGFkwxvN8pBe2+0+PRPGIxyu/JdrJA56Of4o/clmAM8xm8y' +
          'bKCVQ2ArVumoBboPAQMOKc17t2XAOeO2ujYqviCIf6w19qJ8+j5lNklk7jmMAS+G21265j41yO+64XA5' +
          'g+jK3XhWg67y+il9KzeQGqefyYXOZgGyqe28hhkSHzVatZUryBkUsyO9Fh78V8rS0KEX5uxIib88fHlf' +
          'Q5ybIGE1yIgsiy0buMTf2/lx1JzFXIURlXaYcHGhY8qYACWKOARg3WciQPHmsZ7ox5knCyueRlpMClHo' +
          'JXfdF/0TAMXPyMzrNxGuk2xUQm2C+NOLhE3/4PWZjtbboeHkwFyTjDFPJNkKBCaugsLtxvMO2ojEiM8X' +
          'y/iUUx0xU/J3gTnhJDvFOvH7WrnYyixo+Y4VqwzOtZOM/HAUSaqVYTeSBg4v701PdeasJEusmmelQ77l' +
          'zFlJZFELDdBHMOLxy6S7lCYA7sycLz32e0gYxs24YjN0q3oUVVjvEDk+nfuY/mWzqPHATPT3t/59ciBS' +
          'jaUhQtbLUOdN9kRQcsP+Cs+AlLmKYY125r9H/zcT14zje+Lw7znLShiCQtlIGf/LkyzIKshwOhcx8yse' +
          '+An/cfRzaNSQz/G/jzMg7AB6tDbHtpuMJap+fuM5SuXPrwTzyjfFUoirFD8Gnc/qEp+dbmZLmnaAmWsD' +
          'dY=]',
        privateKey:
          'GS[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' +
          'Rwyws3qaWph/A==]',
      },
    },
  },
};

module.exports = configuration;
