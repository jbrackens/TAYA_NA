/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { PaymentProvidersConfiguration } from './server/types';

const configuration: Configuration<PaymentProvidersConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    providers: {
      euteller: {
        identifyApi: 'https://auth-test.euteller.net',
        paymentApi: 'https://payment.euteller.net',
        deposit: {
          username: 'LuckyDino_dev',
          password: 'votpth3u5kto56vcn6h8f5',
        },
        withdraw: {
          username: 'LuckyDino_dev',
          password: 'yuzbq80v3qhiozjdpinu2c',
        },
        merchant: {
          username: 'LuckyDino_dev',
          password: 'rvq8say10jetzy1rjv340x',
        },
      },
      paymentiq: {
        password: 'test123',
        brands: {
          CJ: {
            merchantId: '100011997',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
          KK: {
            merchantId: '100011999',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
          LD: {
            merchantId: '100011999',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
          OS: {
            merchantId: '100011999',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
          VB: {
            merchantId: '100011999',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
          SN: {
            merchantId: '100011999',
            apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
          },
        },
      },
      zimpler: {
        brands: {
          CJ: {
            merchantId: '',
            apiKey: '',
            apiUrl: '',
            scriptLocation: '',
            url: '',
          },
          KK: {
            merchantId: '',
            apiKey: '',
            apiUrl: '',
            scriptLocation: '',
            url: '',
          },
          LD: {
            merchantId: 'luckydino',
            apiKey: '147faf38-e879-4c0a-b449-70a8530d6717',
            apiUrl: 'https://api-sandbox.zimpler.net',
            scriptLocation: 'https://api-sandbox.zimpler.net/assets/v3/pugglepay.js',
            url: 'luckydino.com',
          },
          OS: {
            merchantId: '',
            apiKey: '',
            apiUrl: '',
            scriptLocation: '',
            url: '',
          },
        },
      },
      skrill: {
        gatewayURL: 'https://pay.skrill.com',
        paymentGatewayURL: 'https://www.skrill.com/app/pay.pl',
        apiURL: 'https://api.skrill.com',
        merchantId: '46137915',
        account: 'janne@luckydino.com',
        secret: 'foobar123',
        password: 'LF6ALXst6mR8M7FzT7',
      },
      siru: {
        brands: {
          CJ: {
            site: 'jefe',
            endpoint: 'https://staging.sirumobile.com',
            countries: {
              FI: {
                secret: 'a2bebf0c457d8fc9fb0d7cb19bbcda128d6b6d4f',
                merchantId: 40,
              },
              SE: {
                secret: '12c84dc73851027b00c86c9f15f3e92c03881b65',
                merchantId: 41,
              },
              NO: {
                secret: '65d6ccd0b76af85b7c478a8e4575ecd58aeb80f2',
                merchantId: 42,
              },
            },
          },
          KK: {
            site: 'kalevala',
            endpoint: 'https://staging.sirumobile.com',
            countries: {
              FI: {
                secret: 'a2bebf0c457d8fc9fb0d7cb19bbcda128d6b6d4f',
                merchantId: 40,
              },
              SE: {
                secret: '12c84dc73851027b00c86c9f15f3e92c03881b65',
                merchantId: 41,
              },
              NO: {
                secret: '65d6ccd0b76af85b7c478a8e4575ecd58aeb80f2',
                merchantId: 42,
              },
            },
          },
          LD: {
            site: 'luckydino',
            endpoint: 'https://staging.sirumobile.com',
            countries: {
              FI: {
                secret: 'a2bebf0c457d8fc9fb0d7cb19bbcda128d6b6d4f',
                merchantId: 40,
              },
              SE: {
                secret: '12c84dc73851027b00c86c9f15f3e92c03881b65',
                merchantId: 41,
              },
              NO: {
                secret: '65d6ccd0b76af85b7c478a8e4575ecd58aeb80f2',
                merchantId: 42,
              },
            },
          },
          OS: {
            site: 'olaspill',
            endpoint: 'https://staging.sirumobile.com',
            countries: {
              FI: {
                secret: 'a2bebf0c457d8fc9fb0d7cb19bbcda128d6b6d4f',
                merchantId: 40,
              },
              SE: {
                secret: '12c84dc73851027b00c86c9f15f3e92c03881b65',
                merchantId: 41,
              },
              NO: {
                secret: '65d6ccd0b76af85b7c478a8e4575ecd58aeb80f2',
                merchantId: 42,
              },
            },
          },
        },
      },
      neteller: {
        paysafe: {
          endpoint: 'https://api.test.paysafe.com',
          clientId: 'pmle-442070',
          clientSecret:
            'B-qa2-0-5e4d5288-0-302d021500918c93eb2e141a9036e2f3597be5026969e5e137021406a9b920a8f5adb138a2c3590726240beff48076',
        },
        neteller: {
          endpoint: 'https://test.api.neteller.com',
          clientId: 'AAABV3eToqv_JzzM',
          clientSecret: '0.WEel2bo9NsfPp6Urc-1MElO4qlN7XyW1hZJleBn5G4o.xcdtW1G9n2YnBrAnIYp6mqpj3lE',
        },
      },
      trustly: {
        accounts: {
          standard: {
            username: 'luckydino',
            password: 'cbcb5dd5-b407-4eaa-a460-201184b3dc17',
          },
          pnp: {
            username: 'luckydino_pnp',
            password: 'f166b133-605d-4014-a808-3854d401ed3e',
          },
          bank: {
            username: 'luckydino_fi',
            password: '0af409b7-7451-48e2-b048-1282e273fa36',
          },
        },
        brandsAccounts: {
          FK: 'pnp',
        },
        privateKey: [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA4mlDXuhNwmZYKNFpddevDB1SE0RHATIsbsg8TnY94KQsRhoF',
          'deyzkwWCQvmzv27mFYbjLTnkPqeKpPPOM1Ni1h/TyNP3mALvjFuVOqcRdNmEtxLL',
          'Vf7cNEgXIwVHTI4ls54/K4cIM25NrQez8ZgJPjOhnSxz9ztVmAYLbtLpHvkgD+zX',
          'a9iph6Wmla8h9FfGdzECyXCQhq/F9WqOQXz8ggDhPA8Ee9ySOHT9PeOHEI6eHBVO',
          'MP8ef4zk/xm57QmrV4c/6hLVUVFFGHfGfpYu03J5KuquitKIH23CTzuBia+aWj38',
          'cd5WxSbkElHsEPLTh8YwXxA13qn9PIYQZ+Z88QIDAQABAoIBAH6p1P7rh1USXI+5',
          'V/6NQ2jLnncY44BPyXvQmaxrigJ61ioBtLxcR7oggtdlSqH2MNIqPD24/W/v2yid',
          'HOap58lS1PCtZP6t5cXoFnxRqvpsFks1QHxDsH2vNwJomZLCk2UBSuXXDUd4lgwP',
          'GyQ1ojYiPG/pxpaxoxkBiLPfWnvwZcVMoG/y7dojoW1UkQhFFDeffGw1KUup+Cw1',
          '4rAkfK1FuRqII0eWZDdIhcf33B0YS7wjFvg9BencqGSwadNxezPB/E8CENABFquc',
          'Biv692kvgrUWvLJ1ormpUIdeetAATyJE1bo0tQl2OXLulTAgv2v0uiVGbwCHOw2W',
          'PeMdiWECgYEA/MeHV0HB4IkMTtt6+SXmnVvDRNexQb1BVwtGnLu0ycUrMircHeHe',
          'rLnGAYOv9BTq4g2S4vZ1Pw9Po2jGCZg7XYa3FPnmJGhMekHtEyTxImejvdzTvgdD',
          'MFkAszvC1UBTnwGmU3bZrBBOjHnDrLA2ecSAtuqpv43tE+1r5BCMnEMCgYEA5Uu7',
          'NBvgnh2XFVxRxqEKy9im22lw9KASvhQ3Kp+0yBddYDFrqx0xJeqDbyC37jipicDD',
          'MXKXvRfaXudQ9kuQ7MCwjSF0BhSE8PTo+jwWavX0EupCm8SeccEXW0Muej9zVjXD',
          'ydUEctxQeUVFLwUyqY1IcrzYRat2842no4i0yLsCgYEA45LXHA2NeJKpzAz5B3nB',
          'x4WnpUDyypaSTsVOCylKuCSUoRPJG/YPvT17MD3YmUyDsoQ566+rGtyz/BAFyvmM',
          '6MSx62aYdcqYn7DeuU+W8DySRAqdbwWmzc4zPSneXJMPNaYMkjP8AFamAP5W1g/G',
          '25W3s/ZMYLJr8HbdnXPww3UCgYEAgT8P1Y6FLPsG525zVd/+ouqLGxAzMGBuUCA6',
          '/FarY0HwS0FwLDK3OmUXEvPBWZEs104FeIDcUST53RbMBxiPJzRyEAs0SB0W1m9m',
          'R27JQB9FJchQJVdN7Fbn4HRc5WGQlJ6XrtPYvxm6brECD0ABz5qopKwXyCWfVieZ',
          'v89V//MCgYEAiWuQkfGrUV9N2f3uofO+ZAKzOVzUXzQaQP5/TZFYto65VzQ/RVcc',
          'XOv6dkT3umClN6VYJhlxJeTnbdFFrstfWWUcuQqSJXVKJlE4Z5zNiBLmdE5sTxfL',
          'UmdatzKpnEdMnBvd9Hs417VPv3izYN51xg0fIsUQKpb1YxB9OtGy7p8=',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
      },
      emp: {
        apiUrl: 'https://epro.empcorp.com',
        apiKey:
          'MWM0ZjZjZWQ2MzJlYjU0YjVhOTg2YzM4YjM0ZjA5NzI3MmVjMjg2YzRlMzgxODUzNjc1NGQ3Y2I2ZjYxNzAzYw==',
      },
      jeton: {
        endpoint: 'https://sandbox-walletapi.jeton.com',
        brands: {
          LD: {
            apiKey: 'f89b57b7820f4f37a4d5da2b53a0d64f',
          },
          CJ: {
            apiKey: 'f89b57b7820f4f37a4d5da2b53a0d64f',
          },
          OS: {
            apiKey: 'f89b57b7820f4f37a4d5da2b53a0d64f',
          },
        },
      },
      muchbetter: {
        walletHost: 'w.api.muchbetter.com',
        walletPort: 443,
        authorizationToken:
          'GS[YvvJYwf0FzjsvjZM5ODKERVCqkib1De2vRCHcHz45Z8GtAyLkVcdHppBnpocxUa7TbGc6I/XwfNBFi+bW30CwuiVFHCm3m9aM0vp924MoeTxa7Yw]',
        merchantAccountId: '540228',
        signupLink: 'https://a.api.muchbetter.com/merchant/user?trackingCode=THU1NDAyMjg',
      },
      worldpay: {
        merchantCode: 'LUCKYDINOTEST',
        username: '1BIP2JSK3EB2JHPIR62Z',
        password: '7V_x94Z)o8dUKcE6/my',
        secret: 'FmK7mDVi>6yeF7sRXfXB3vqvj%8',
        url: 'https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp',
        installationId: '1185377',
        withdraw: {
          merchantCode: 'LUCKYDINOTEST',
          username: '1BIP2JSK3EB2JHPIR62Z',
          password: '7V_x94Z)o8dUKcE6/my',
        },
      },
      qpay: {
        url: 'https://test.avantgardepayments.com/agcore/payment',
        meId: '201710270001',
        agId: 'paygate',
        distributorId: 'AGG00001002',
        aesKey: 'oqUl4D0LqA4plZw4reAX/K3UKJoQdet0k/N6X6K4Y5k=',
        defaultAesKey: '9v6ZyFBzNYoP2Un8H5cZq5FeBwxL6itqNZsm7lisGBQ=',
        aesIV: '0123456789abcdef',
        withdrawals: {
          url: 'http://114.143.100.102:92/agWalletAPI/v2/agg',
        },
      },
      veriff: {
        apiUrl: 'https://stationapi.veriff.com/v1',
        apiToken:
          'GS[DufdNwCaWcgZazHJlAmZohoVTNbLquIEtQ/fhsl0shaRV2ElUd7LEJoohRbTevacrRnYi0VAWJWCgd8G5h+VZYb0Hn8m+c6C0ZzJoQ==]',
        apiSecret:
          'GS[Yv69h64zICXT46ohdn8moVb9sDOmb923NrkuhrUUo0M+ILrjpmpUJvZRl5SachWYcUA1Nsk+olGkXtaT7MF+So1ej9vPa4sEWK/WxA==]',
      },
      neosurf: {
        apiUrl: 'https://pay.neosurf.com',
        merchantId: '24842',
        secret:
          'GS[kEOgMbbA2jCBDJ4evyma+d7s/AGIVVcr0K3SWlQYqAB3DHqGOBBokqa954/DPBQioC8vLBHVmQtZRaqkicMcbbqsphLsyvUH]',
      },
      luqapay: {
        CJ: {
          apiUrl: 'https://sandbox-wallet.luqapay.com',
          apiKey: '087b151fb5bd44fdade70a393cd96d63',
          secret: 'ce2c81a987ee459eb3ddecdc5765b09f',
        },
        KK: {
          apiUrl: '',
          apiKey: '',
          secret: '',
        },
        LD: {
          apiUrl: 'https://sandbox-wallet.luqapay.com',
          apiKey: '087b151fb5bd44fdade70a393cd96d63',
          secret: 'ce2c81a987ee459eb3ddecdc5765b09f',
        },
        OS: {
          apiUrl: 'https://sandbox-wallet.luqapay.com',
          apiKey: '087b151fb5bd44fdade70a393cd96d63',
          secret: 'ce2c81a987ee459eb3ddecdc5765b09f',
        },
      },
      brite: {
        LD: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
        CJ: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
        OS: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
        KK: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
        FK: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
        VB: {
          apiUrl: 'https://sandbox.britepaymentgroup.com/api',
          publicKey: 'sandbox-4c010ae96d72fadc13630c180bbf346a725fc8c1',
          secret: '7c3927766f295dd9dfe80f4fb1830419b3a1307b',
          merchantId: 'ag9ofmFib25lYS0xNzYyMTNyFQsSCE1lcmNoYW50GICAgIqhrJ0IDA',
        },
      },
      isignthis: {
        merchantId: 'esportsent_payout',
        apiUrl: 'https://api.stage.payout.isx.money',
        senderIban: 'CY43904000010000115366301002',
        domain: 'stage.esportsentertainment.payout',
        subdomain: 'stage.esportsentertainment.payout-apiKey-esportsentertainment',
        hmacSecret:
          'GS[fiTtASs+rmH8tCPy1wt8S4XmiPa9e7+GpTM8h5bMKHSDTWskrkPu5npjBV0IBNNQopuMurEOUNE=]',
        publicKey:
          'GS[br5X0E10AIlgqbbI2Gcyxqbjjj9RqM5xghEc+BP8Y9Gt8OO9kpuFiUmaeOsyAuqvOZexKkTnE1deo' +
          'pjqwLWHibbQ4hLibrIjwK1EwdesOpGVqF1FUG3ISEGNOJKVaF1mNgWYJeel7KbiQ05oeuCObXBnWwG+S' +
          'ZqoraSK31q+2S0LbPnp47Q4g7LxXTWiTrh7YwPvVngHTm5j+W0ET4+zhDTXLW1OfCdMriRcxMuuImA1I' +
          'jIFTQz16UV4vvPNIrxXua8o9AZ+NFjpN/RWkCkzPckcQZlvGC5vRuLi3PcuhVoC2BSs1TVEw66p1cP6L' +
          '8M4s3zsrJpV0k9/9VbqY7/48/9RfBs3XJlD3+XAOuiyH0nTZnbKmXy1Bx8IuBcR0b5p27A0bfDS8d5H6' +
          'x3/6w7drN/u6s/+98PgSntOLzmYSwawT24ZOlu3j0avpLDZcBgiDgf2+N6XvrooRYrPuPvU5+aOGold2' +
          'g2ULnAMV3sRAxfMD/evrwBx+IRfSnI2l1dC5T6m8U7xmjTbV76Yccac4rm/h7chOJgmB1wsdzjzIJSoj' +
          'wsSZr7BH8OKSPWnJShcknghrNcTr2QGIFC62jOz9uSDhtLh6w8OxS/468MWZq2RniMv4NqgDWKYmaqOz' +
          'dqcOPq0rVxPsAWfgeFndHuytkSfBRmr9RnEeDoNgazuEXeW4bLDgi4qGUjT1+hjT/p+bJGoAajCc4lXJ' +
          'rsWF93rjMkm3O1Xmn7X6ggnnYkPMYH3A9KZ/W3nbd+jKszWXfGAvBrxkHjoSSfa64oMfYPMQXs8mmUI7' +
          'bOtR96cTokcR5tb1MXN9FdxzESIxDGuHGUjM4QGEC5TQRCslDCEVT7jfm1oIcvda5kaTh8hmVAT6fq94' +
          'XBmIvI0wIh3ZzUDb+GBYzapqhcm0IBNQnrbdpYTmxwUx7qI1BHe2bmuDP2pp3Ug++wLC5AePnt4Kh595' +
          'cLCrjdOuOI0db/PngdDIla9TXWo9mtddsUWF8F64o4EsstX9dcd8500Vo1nJgqEJLIZGpBoaFuXL6KPL' +
          '3LHKOINWANVyTusCeERb0nElnwYBIyRZrKT6W6asy1R4i0WZ9EVrGIl830fZaJuWjBZUUZRRgD7Px5x5' +
          '+s=]',
        privateKey:
          'GS[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' +
          '0mXJ4CgRLJ7UFashsG9LWk9]',
      },
    },
  },
};

module.exports = configuration;
