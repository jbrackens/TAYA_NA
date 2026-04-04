/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { GameProvidersConfiguration } from './server/types';

const configuration: Configuration<GameProvidersConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    providers: {
      bfgames: {
        api: {
          host: 'gs-giantgaming-int.beefee.co.uk',
          key: 'giantgaming-api-key',
          offlineToken: 'FpUJKBQv7RBR9ffc',
        },
        username: 'bfgames',
        password: 'yncjsh4D7bGMtE4B',
      },
      booming: {
        api: {
          url: 'https://api.eu.booming-games.com',
          brands: {
            CJ: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            KK: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            LD: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            OS: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            FK: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            SN: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            VB: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
          },
          germanBrands: {
            CJ: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
            LD: {
              key: '6gapyb6JLQsVKLLhGz+9IQ==',
              secret: 'xoEsOdcMD2mxylYzalP9XGPCafTIeQwtKIe8guIq/5iD99M9fEkseEIrYY3MWvXr',
            },
          },
        },
        callbackUrl: 'https://beta-wallet.luckydino.com/api/v1/booming/callback',
        rollback_callback: 'https://beta-wallet.luckydino.com/api/v1/booming/rollback_callback',
      },
      elk: {
        gameServer: 'gamelauncher-stage.contentmedia.eu',
        operatorId: '7770472',
        partnerId: 'elkstage',
        password: 'passwordstage',
      },
      evolution: {
        hostname: 'luckydino.uat1.evo-test.com',
        casino: {
          key: 'luckydino0000001',
        },
        api: {
          token: 'test123',
          password: 'F4jtgFh5PoANgwToqc1p',
        },
        authToken: 'c6514173-5543-4435-a389-13d895907f0c',
      },
      eyecon: {
        apiServer: '',
        gameServer: 'stg.eyecongames.com',
        accessid: 'uy76et522w',
      },
      habanero: {
        brandId: '5fb3655a-a83d-e811-80ef-000d3a800c8d',
        apiKey: '259E2D1A-5F5A-41A9-B410-E67EA6126533',
        username: 'habanero',
        passkey: 'iqjojewoijeqwioewqx',
        gameLaunchUrl: 'https://app-test.insvr.com/go.ashx',
      },
      lottowarehouse: {
        gameServer: 'beta-games.luckydino.com',
      },
      nolimitcity: {
        gameServer: 'partner.nolimitcdn.com',
        apiServer: 'partner.nolimitcity.com',
        key: 'ey3Shoh3ie',
      },
      microgaming: [
        {
          launchUrl: 'https://redirector32.valueactive.eu/Casino/Default.aspx',
          mobileLaunchUrl:
            'https://mobile32.gameassists.co.uk/MobileWebServices_40/casino/game/launch/',
          apiUrl: 'https://orionapi32.gameassists.co.uk/Orion/VanguardAdmin/SOAP2',
          jackpotsUrl:
            'https://api2.gameassists.co.uk/casino/progressive/v1/counters?currencyIsoCode=EUR',
          demoServerId: '22619',
          variant: 'UAT',
          demoVariant: 'uat-demo',
          manufacturerId: 'MGS',
          brands: {
            LD: {
              serverId: '23204',
              lobbyName: 'luckydinoUATcom',
              login: 'microgaming',
              password: 'doWNkpB4PR7L',
              orionLogin: 'QFLuckyDino',
              orionPassword: 'f9HVYg000',
              applicationid: '4023',
            },
            CJ: {
              serverId: '23204',
              lobbyName: 'luckydinoUATcom',
              login: 'microgaming',
              password: 'doWNkpB4PR7L',
              orionLogin: 'QFLuckyDino',
              orionPassword: 'f9HVYg000',
              applicationid: '4023',
            },
            KK: {
              serverId: '23204',
              lobbyName: 'luckydinoUATcom',
              login: 'microgaming',
              password: 'doWNkpB4PR7L',
              orionLogin: 'QFLuckyDino',
              orionPassword: 'f9HVYg000',
              applicationid: '4023',
            },
            OS: {
              serverId: '23204',
              lobbyName: 'luckydinoUATcom',
              login: 'microgaming',
              password: 'doWNkpB4PR7L',
              orionLogin: 'QFLuckyDino',
              orionPassword: 'f9HVYg000',
              applicationid: '4023',
            },
            FK: {
              serverId: '23204',
              lobbyName: 'luckydinoUATcom',
              login: 'microgaming',
              password: 'doWNkpB4PR7L',
              orionLogin: 'QFLuckyDino',
              orionPassword: 'f9HVYg000',
              applicationid: '4023',
            },
          },
        },
      ],
      netent: [
        {
          countryId: null,
          manufacturerId: 'NE',
          endpoint: 'https://luckydino-api-test.casinomodule.com/ws-jaxws/services/casino',
          staticServer: 'https://luckydino-static-test.casinomodule.com',
          gameServer: 'https://luckydino-game-test.casinomodule.com',
          liveCasinoHost: 'luckydino-livegame-test.casinomodule.com',
          gameinclusion:
            'https://luckydino-static-test.casinomodule.com/gameinclusion/library/gameinclusion.js',
          defaultBrand: 'LD',
          callerId: 'NetEntTestUser757',
          callerPassword: 'CGbhAJ8K1Y8S6bQV8O8B',
          pooledJackpots: ['megajackpot1', 'hog_large'], // TODO classify jackpots
          brands: {
            LD: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://luckydino.com/loggedin/',
            },
            CJ: {
              merchantId: 'CJ_merchant',
              merchantPassword: 'tester2',
              lobbyUrl: 'https://casinojefe.com/loggedin/',
            },
            KK: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://justwow.com/loggedin/',
            },
            OS: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://olaspill.com/loggedin/',
            },
            FK: {
              merchantId: 'FI_merchant',
              merchantPassword: 'tester3',
              lobbyUrl: 'https://hipspin.com/loggedin/',
            },
            SN: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://freshspins.com/loggedin/',
            },
            VB: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://vie.bet/loggedin/',
            },
          },
          playerIdMapping: {
            LD: 0,
            CJ: 1000000,
            KK: 2000000,
            OS: 0,
            FK: 0,
            SN: 0,
            VB: 0,
          },
          legacyIdFormat: true,
        },
        {
          manufacturerId: 'NES',
          countryId: ['SE'],
          endpoint: 'https://luckydinose-api-test.casinomodule.com/ws-jaxws/services/casino',
          staticServer: 'https://luckydinose-static-test.casinomodule.com',
          gameServer: 'https://luckydinose-game-test.casinomodule.com',
          liveCasinoHost: 'luckydinose-livegame-test.casinomodule.com',
          gameinclusion:
            'https://luckydinose-static-test.casinomodule.com/gameinclusion/library/gameinclusion.js',
          defaultBrand: 'LD',
          callerId: 'callerid',
          callerPassword: 'callerpassword',
          pooledJackpots: ['megajackpot1', 'hog_large'], // TODO classify jackpots
          brands: {
            LD: {
              merchantId: 'testmerchant',
              merchantPassword: 'testing',
              lobbyUrl: 'https://luckydino.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            CJ: {
              merchantId: 'CJ_merchant',
              merchantPassword: 'tester2',
              lobbyUrl: 'https://casinojefe.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            KK: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://justwow.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            OS: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://olaspill.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            FK: {
              merchantId: 'FI_merchant',
              merchantPassword: 'tester3',
              lobbyUrl: 'https://hipspin.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            SN: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://freshspins.com/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
            VB: {
              merchantId: 'LD_merchant',
              merchantPassword: 'tester1',
              lobbyUrl: 'https://vie.bet/loggedin/',
              config: {
                enableDefaultSwedenButtons: true,
                pluginUrl: 'https://d1vco3ll4z63bl.cloudfront.net/assets/netent_se.html',
              },
            },
          },
          playerIdMapping: {
            LD: 0,
            CJ: 1000000,
            KK: 2000000,
            OS: 0,
          },
          legacyIdFormat: false,
        },
      ],
      oryx: {
        walletCodes: {
          CJ: 'CASINOJEFE',
          KK: 'KALEVALAKASINO',
          LD: 'LUCKYDINO',
          OS: 'OLASPILL',
          FK: 'FIKSUKASINO',
          SN: 'FRESHSPINS',
          VB: 'VIE',
        },
        germanWalletCodes: {
          CJ: 'CASINOJEFEDE',
          LD: 'LUCKYDINODE',
        },
        gameServer: {
          server: 'play-prodcopy.oryxgaming.com',
          auth: {
            username: 'oryxluckydino',
            password: 'test',
          },
        },
        apiServer: 'api-prodcopy.oryxgaming.com',
        api: [
          {
            walletCode: 'CASINOJEFE',
            auth: {
              username: 'luckydino_to_agg',
              password: 'abcd1234',
            },
          },
          {
            walletCode: 'KALEVALAKASINO',
            auth: {
              username: 'luckydino_to_agg',
              password: 'abcd1234',
            },
          },
          {
            walletCode: 'LUCKYDINO',
            auth: {
              username: 'luckydino_to_agg',
              password: 'abcd1234',
            },
          },
          {
            walletCode: 'OLASPILL',
            auth: {
              username: 'luckydino_to_agg',
              password: 'abcd1234',
            },
          },
          {
            walletCode: 'FIKSUKASINO',
            auth: {
              username: 'P342_FR',
              password: 'test',
            },
          },
          {
            walletCode: 'CASINOJEFEDE',
            auth: {
              username: 'casinojefe_de__to_agg',
              password: 'abcd1234',
            },
          },
          {
            walletCode: 'LUCKYDINODE',
            auth: {
              username: 'luckydino_de_to_agg',
              password: 'abcd1234',
            },
          },
        ],
      },
      playngo: {
        environments: [
          {
            pid: 572,
            accessToken: 'stagestagestagestage-mlt',
            mobileLaunch: 'https://mltstage.playngonetwork.com/casino/PlayMobile',
            desktopLaunch: 'https://mltstage.playngonetwork.com/casino/ContainerLauncher',
            manufacturerId: 'PGM',
            api: {
              endpoint: 'https://mltstage.playngonetwork.com:33001/CasinoGameTPService',
              auth: {
                user: 'ldgapi',
                password: '080c6e938bf86e55aa2d2d68fd5e9f24',
              },
            },
          },
          {
            pid: 361,
            accessToken: 'stagestagestagestage',
            mobileLaunch: 'https://caocwstage.playngonetwork.com/casino/PlayMobile',
            desktopLaunch: 'https://caocwstage.playngonetwork.com/casino/js',
            manufacturerId: 'PNG',
            api: {
              endpoint: 'https://caoapistage.playngonetwork.com/CasinoGameTPService',
              auth: {
                user: 'juvapi',
                password: 'nSoMpJpjKsOMOkmuGVCPNHzyP',
              },
            },
          },
        ],
        brands: {
          LD: {
            lobbyUrl: '/loggedin/',
          },
          CJ: {
            lobbyUrl: '/loggedin/',
          },
          KK: {
            lobbyUrl: '/loggedin/',
          },
          OS: {
            lobbyUrl: '/loggedin/',
          },
          FK: {
            lobbyUrl: '/loggedin/',
          },
          SN: {
            lobbyUrl: '/loggedin/',
          },
          VB: {
            lobbyUrl: '/loggedin/',
          },
        },
      },
      pragmatic: {
        apiServer: 'api.prerelease-env.biz',
        gameServer: 'jrscvnt.prerelease-env.biz',
        brands: {
          LD: {
            secureLogin: 'jrscvnt_luckydino',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          CJ: {
            secureLogin: 'jrscvnt_luckydino',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          KK: {
            secureLogin: 'jrscvnt_luckydino',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          OS: {
            secureLogin: 'jrscvnt_luckydino',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          FK: {
            secureLogin: 'jrscvnt_fiksukasino',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          SN: {
            secureLogin: 'jrscvnt_sportnation',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          VB: {
            secureLogin: 'jrscvnt_viebet',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
        },
        germanBrands: {
          LD: {
            secureLogin: 'jrscvnt_luckydinode',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          CJ: {
            secureLogin: 'jrscvnt_casinojefede',
            secretKey: 'testKey',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
        },
      },
      redtiger: {
        apiServer: 'feed-luckydino.redtiger.cash',
        gameServer: 'gserver-luckydino-dev.dopamine-gaming.com',
        apiKey:
          'GS[P2WE9H4PQUgK8hfzkJXIXZQLQSZ18mCIpA2WewK2p02DJI8B11rzWao6QWS5aHTgyybTyPOqMj4rNqYRhH/BX7JxUp7MwIYAPNHTbQ==]',
        reconToken:
          'GS[DfS8755eDJiqBNVINPEwggf8bu0l8+qFQNid9VpsC6u+AsYMCPJzm6Kq102pi8Z4HVw8u5OHmi1tb+Gr3zhffvP5RcNEO8923ekM1A==]',
        bonusApi: {
          key: 'PaWedSvY1fDgtBikQvaT9Fn8i5sNiyab',
          secret: 'J2inygKCh1IJTdNGaKoTfHxs106KCYuQ',
        },
      },
      synot: {
        api: {
          server: 'tst-neomt01.syngamtech.com',
          pff_server: 'neosit.synot.com',
          customer: 'LuckyDino',
          secretKey: 'mn6JX2BLugSVG3Xj14c4dZCFDNTBQVPU',
          // customerKey: 'yc3nSZ9ZjsdLSpfBXtf6qOoAWzy8tSzl',
        },
      },
      thunderkick: {
        apiServer: 'qa-ext-casino.thunderkick.com',
        gameServer: 'ext-qa-gameservice.thunderkick.com',
        apiServerUser: 'luckydinoApi',
        apiServerPass: 'wFmBvppkTaJxDDu6',
        user: 'luckydinoApi',
        pass: 'wFmBvppkTaJxDDu6',
        providerId: 'Thunderkick',
        lobbyUrl: '',
        operatorId: 3013,
        jurisdiction: 'MT',
      },
      williams: {
        flashUrl: 'https://lon-pt-ca.wi-gameserver.com/casinomatrix/matrix.html',
        mobileUrl: 'https://lon-pt-mob.wi-gameserver.com/resource-service/game.html',
        brands: {
          LD: {
            lobbyUrl: 'https://luckydino.com/loggedin/',
            partnerCode: 'luckydino',
          },
          CJ: {
            lobbyUrl: 'https://casinojefe.com/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'casinojefe' prod,
          },
          KK: {
            lobbyUrl: 'https://justwow.com/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'kalevala' prod,
          },
          OS: {
            lobbyUrl: 'https://olaspill.com/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'kalevala' prod,
          },
          FK: {
            lobbyUrl: 'https://hipspin.com/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'kalevala' prod,
          },
          SN: {
            lobbyUrl: 'https://freshspins.com/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'kalevala' prod,
          },
          VB: {
            lobbyUrl: 'https://vie.bet/loggedin/',
            partnerCode: 'luckydino', // partnerCode: 'kalevala' prod,
          },
        },
      },
      betby: {
        rendererLib: 'ui.invisiblesport.com',
        operatorID: '2047661139927633920',
        api: {
          host: 'external-api.invisiblesport.com',
          pubKey:
            '-----BEGIN PUBLIC KEY-----\n' +
            'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAvswGV7undKNelAWGn4Fq\n' +
            'drw45sXl5Q4XXdpvF+fR/ZvgkBytlp8SFqBBoD0bJ+M6C2EWD9vQ8CuaqmxifUSB\n' +
            'zwHVbWPAqxcteRBV3bwufBPozG9tpzFuoJhV077PDg21v8enYuNfLCZLaCjCa08H\n' +
            'BotE0I0z42uoIIeAIV+8jrwGo7AZR+bi/PWr21vIiHxQ+Flg4+XPpFUizHz/vdUC\n' +
            'HaT7l7nC55ApdC1C3V3PVZNJHaX3S1R9MxOX3cnnMzeb7rVidWr3YQldWBWqBybY\n' +
            'Kby+dzlUPuUXbo5joafOcY7iaqPj+rs9t34RyB+W52SbqruRCHkTWPZWfmCesiW7\n' +
            'eYgBzBw5dAJodIqhVqM31ZpMJM4ouMJUEQtLlx+trZkO6fdbYjfBZhU1/SvoZbu9\n' +
            'PZjN6/V/NV2sRbLnWBKuwkl5IcjIvoCFs0JL34pBxCBbh5pWPj44xosezQc+0P2m\n' +
            'VHOuM7jmprV8Uj0dd4/MDPYxlAeSMFo956lLWKJL4330zHdewFEY7kha10RgFzID\n' +
            'aFVe+jxEHNSY71WKuM6tISTmiJPCc/NiEpNQvuOLXHDelskm5oAXx3g0rEaVb9rN\n' +
            'm0/rrMq9RyctCkX/cKgws/1DQQOKU1CvzQMOdqFshp5eZP1r7kRTo5vzYPb4XA1p\n' +
            'XjYNgHzOmOrryusUIO44rs0CAwEAAQ==\n' +
            '-----END PUBLIC KEY-----',
          // eslint-disable-next-line max-len
          prvKey: `GS[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]`,
        },
        brands: {
          SN: {
            brandId: '2049164620094119936',
            themeName: 'sport-nation',
            pubKey:
              '-----BEGIN PUBLIC KEY-----\n' +
              'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAlhjKnu7M5cZcSlVdL/H2\n' +
              'uQH6xjJsm2VNYURG3uWIWXv+fG/PMByd0Wz3lKq7UNta+DLOUkgWPo2HQ/FR5qZ5\n' +
              '3ivJjhFM9EZt50S335Bq85S4IdhEEDdTp40s613CuB0n9U0eRrpa6nwOjAKW4wkJ\n' +
              'XeEyeEJqmc2VkNnAN7kHrfOQI5D1AVo+RopLTB57RsnRj/tj1UN/COApNBNayHEu\n' +
              'kphK0Qn81Xfbim7KqoONGdL2M7D8x3RZoXj2NcWyAX0eiZYPZTPPvQ0Wykj0R+82\n' +
              '2jijC8DUap6Xmd7/Gjz9ipU9udjyv4cBzEMjBCuo2ZMnBAnTVj+N/S6mhfeVp4qJ\n' +
              'ySEHkeURkre3ysC3sirBXiVdiAY0npvA0jxyYkln21akBVh5ZJV5ZhJ4iyqF/HzO\n' +
              'X/agl3vLPvlB8TUi7MToOYvIKhr4Z5NN0dxzqikT0RhdlruXDfb5p2a9mYDiS4c2\n' +
              'ZKFsPB7TbYGDjI40mZapw856lCOUFdTOFGEjtcy1e0WvovYVTNMdGJdrwy+HgWdX\n' +
              'TYcqjmVliuMcjj6Ic7ky+ME0y7PZFWPL8T4PcjK6TZ7yvr8cFcYfzUHw0hrt+9Tc\n' +
              '/I87exDLuyTjPzcmWMSI91t1Oy61ViIsw8VbYkQwm2Va5ShdBQ6dKhAcHvQM0K3q\n' +
              '6kAjepg0fDBQw39UG5xEWgUCAwEAAQ==\n' +
              '-----END PUBLIC KEY-----',
            bonusTemplateId: '',
            freeBet: {
              maxAmount: {
                EUR: 10,
                INR: 1000,
                BRL: 50,
                PEN: 40,
                CLP: 8000,
                NOK: 100,
                SEK: 100,
                GBP: 10,
                USD: 10,
                CAD: 10,
                NZD: 10,
              },
            },
          },
          VB: {
            brandId: '2049202926706106368',
            themeName: 'vie-bet',
            pubKey:
              '-----BEGIN PUBLIC KEY-----\n' +
              'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA0Z/xTjCkid7icEkwHnkK\n' +
              'XDg6ZpYWjSzT3HORgFYUW46JSVNzSaFaT4B6AxGkzWpKsM/gMlMSHUejpapP6Wh0\n' +
              '52Tgv3JvYE+d36pA4Sau713ivHtPLFo/jVwWuZ/8mn90Vlq/F0/rSiQMreLxvKLg\n' +
              '7fy9QFVWWacywpwwG7q0Wh47h8Ca9YT6ol86WxhlBzxJ0ac2bBj3q9Th1HzovJpW\n' +
              's7CjMlQPuor7kTgQjDkIElv3VdPJDtPVCHK3wKn/KKqsgdAOip/PPYQ3RgqU0Vf5\n' +
              '8gX+NW7VWys7wxcHWhW0ibmGI9mxhIARctrdLuwgIrecsfIO2W/rydfFbpAIb0Jo\n' +
              'RrS5MIyL1foBjFK7Ue7HEFhqiuQB9STI1W/r40TUCv3kK8Qjndxe+5Zx+Sd7GppS\n' +
              'RmklwScQSTtNRtlc4wX+BXAp+Vm/NCUJ6QV43FVZoW1oUCDg3KxHe4Dh3dOunK16\n' +
              'ZHDD/GdmsnUM7zJMq3oQhw8ZYEvdWjSoP8dnTfzqlBUMfp73JSG3hAf3z/DdZhB+\n' +
              'nvW/8r3ONgUO+Ub85x2Qq+/Wg6OWGtq0pDVQL3aCgP4Wx4yHmlq2DslQQ8dx60AY\n' +
              '/G+eSQ4obAXNo+ihJ095KhE6VvuHnPspr2AjNJIWihTxd2KAxAcjWehL7CUb4vTB\n' +
              'tVRNCulkjYM3UlInLW7w058CAwEAAQ==\n' +
              '-----END PUBLIC KEY-----',
            bonusTemplateId: '2113994082446610432',
            freeBet: {
              maxAmount: {
                EUR: 10,
                INR: 1000,
                BRL: 50,
                PEN: 40,
                CLP: 8000,
                NOK: 100,
                SEK: 100,
                GBP: 10,
                USD: 10,
                CAD: 10,
                NZD: 10,
              },
            },
          },
        },
      },
      yggdrasil: {
        environments: [
          {
            demoLaunchUrl: 'https://staticpff.yggdrasilgaming.com/init/launchClient.html',
            launchUrl: 'https://staticstaging.yggdrasilgaming.com/init/launchClient.html',
            manufacturerId: 'YGM',
            jackpotsUrl: 'https://production.yggdrasilgaming.com/game.web/services/feed/jackpot',
          },
          {
            demoLaunchUrl: 'https://staticpff.yggdrasilgaming.com/init/launchClient.html',
            launchUrl: 'https://staticstagingcw.yggdrasilgaming.com/init/launchClient.html',
            manufacturerId: 'YGG',
            jackpotsUrl: 'https://production.yggdrasilgaming.com/game.web/services/feed/jackpot',
          },
        ],
        brands: {
          LD: {
            org: 'LuckyDino',
          },
          CJ: {
            org: 'CasinoJefe',
          },
          KK: {
            org: 'Kalevala',
          },
          OS: {
            org: 'Olaspill',
          },
          FK: {
            org: 'Fiksukasino',
          },
          SN: {
            org: 'Sportnation',
          },
          VB: {
            org: 'Viebet',
          },
        },
      },
      evoOSS: {
        hostname: 'luckydino.uat1.evo-test.com',
        casino: {
          key: 'luckydino0000001',
        },
        api: {
          token: 'test123',
        },
        jackpotApi: {
          token: 'test123',
        },
        authToken: 'c6514173-5543-4435-a389-13d895907f0c',
      },
      relax: {
        api: {
          gameLauncherUri: 'https://d2drhksbtcqozo.cloudfront.net/casino/launcher.html',
          partnerApi: 'https://stag-casino-partner.api.relaxg.net:7000/papi/1.0',
          partnerApiAuth: {
            user: 'eeg',
            pass: '2pdS7CDtOcy5BH82',
          },
          partnerId: 1735,
        },
      },
      delasport: {
        sharedSecret: 'GS[W165jsGX9+dj34aLmYxywfm7lDI0hSEAvisT8QybhJCUpHi4U2IO5hK5Wjlq+5wS7NgfCi1gubTW0SVBODFpvoG144FmYe/05SNLd24hV8vdDM8j]',
        iframeUrl: 'https://sb-vie.dev.eeg.viegg.net',
        apiUrl: 'https://api.test-delasport.com/v1/json',
        apiKey: 'GS[/5Rhfa0+XV0woxUrwVTD+iBtNju0Xxf5A7cDtPi4TqQ4i9NkTfbm0juEsU4vzthrU4Q/6jnIutjEk/bv4zm9S6NwsFt86cyCRXjZaVRrf8yGdT1BDMVkRCz99AmBa09X17HJFA==]',
        apiAccess: 'GS[kUu37TxZZIB0YVY6z7QwIZHCxT0XMkptMHucWh4U6lIpbrybwwzY9GvwNsWp3yx/R94ONXMiEBWfVoj+f+ClnE66SMeg1xxdjNZJzkoZjLGrDT9rlZA2IWuSXRygkt6HsZxXomUm6pKyBrHeiLXRT9ub304EShEef41tyJI6/9Ll2peor4wPI+asHoo=]',
      },
    },
  },
};

module.exports = configuration;
