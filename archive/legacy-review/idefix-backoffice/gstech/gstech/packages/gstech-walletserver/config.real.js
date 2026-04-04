/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { GameProvidersConfiguration } from './server/types';

const configuration: Configuration<GameProvidersConfiguration> = {
  publicKey: '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    providers: {
      bfgames: {
        api: {
          host: 'gs-giantgaming.beefee.co.uk',
          key: 'GS[Ysysr2J9AOI5yU4BCQWmpl2ftWvmqaWyCffI+h2s1nDudmmQeFud86rjg5DVt96kW0Nqios1xVk=]',
          offlineToken: 'GS[domtQQP/3i/JLt7J6MI45dvPh5LM+IFZa8Z5msqatEAIreRHhJxtDcbKJp0PTkXsWYiyFiW7sBb/23pRlCaBQqvgwD816o0LNrxmEN4x1w==]',
        },
        username: 'bfgames',
        password: 'GS[tpbPGh4fzilJnQvnQ3jP0Kk4yMcgy5TGxsJAlkdxggDizAGxjkb034ZXrxkBXff0OuteBkooGSPlmT+9c+3J5g9fEvJUOYjz5Eni+8CyOA==]',
      },
      booming: {
        api: {
          url: 'https://api.mt.booming-games.com',
          brands: {
            CJ: {
              key: 'GS[0dvDVzN7ip4iO5Nq1Pvje9oHULQMJurQwuhenfU+oCcbMkQsP0oO0N5yq8F2zJYe+Ec7f/u7bq9xY/Bg0c7g0A==]',
              secret: 'GS[LHbLIeOCHZG55KyKAkWJBQjKhEEl9FszMofTLk7JF/T+A6E9jsz75z4NJcl3Yaw7nCUxM2cwgLRUmCqoIcipvib94/vqm7lPl/sW0QGfPygsAIlVr7WK59eqa2kAk2AJoA7+nI+/Rq4=]',
            },
            FK: {
              key: 'GS[YxxX5a+KTDxEaqiIzAgSd3lGnF81E5NrfU6rdq/F6g9Q8+kRvYnUWvqxgc05TLWcpttbYSIKU8dbCTNCBWqdhg==]',
              secret: 'GS[fxvdwE3CK3tw6QQtKz1acC/+jV/gBL4oSIXgR5jll35/4rLge4y+OMB9N+9LPmD0no/d9ViE7Mz0ygVB6Ek3oQXadptpmRlptLvaaKnkofFuEp+2g4TLhBTbz7gb1zG3pCrXcKJbvYA=]',
            },
            KK: {
              key: 'GS[GwORVJAL7RR5xyEttvRJFkDVefXdxeboEnioLyhRDf8lAWe4KGuDjlM8meNJud7iNWsBZGAwyfuCK80E2iz/TA==]',
              secret: 'GS[pZlYPCjs/TM7YGHTOgb6dFpihK3OO5iZTdk3fn5DyGkdpxS3pTFDPcWtoisvtETQdjiKbyv2X5fE4ITGC9820LebEaHVPlDg5y0K/i5cE8jpTi4FLpSfql6rOC+A0kfTwSZzzS/ninc=]',
            },
            LD: {
              key: 'GS[1rTA0Wnfl2aH/dzhMxq5vrwkLqCR5Q+jQReoWfHlUwv22c6hPOM1DCoVDnvH0OBVM3NbHxME5OsptWBKbpgyig==]',
              secret: 'GS[FZJsTUNkDBqk6HdGF2A8PneKIgN1bpv1ptMF6lDcpyJOjiSHUJRhjl76EUDwh/HYNbmfeqO33xF6HFjNOOZMuMq6u6sUslXibe9aS61+VUmG416Usjb5zNFzRpca+zZP5fI/MI0lj7w=]',
            },
            OS: {
              key: 'GS[j8g7NmG3czbFkZP1TcsfnVKwWACqKj3UMD9qWsMGtiYisCB9o+4aSe07ZGKIJi3O43fpGjA5lOeyk9Jd7WP/kw==]',
              secret: 'GS[uYY54P1YrAOzmCoggUr36h+uXSE05/kEv2OcYI9uqXUa4b8yIcvtYngS67og0aYiA/iiiepmCpWFobFdrDyewEsC6SruqRUc4e9RLByMhTpxhBba08jicm1mn7Dzz1Qfu9ERm0S/QGI=]',
            },
            SN: {
              key: 'GS[ZZLo5J/K7fKz9XJja/lFdMPXCOdm9+zkZcmhOup/j702g7GKX9U/CXgvYtDUqq3jQLlKOZOAVUTZCal64YYNAA==]',
              secret: 'GS[m/doUMC1l9oAV/dT3Ei3gm2goEQr5NmXWbeTBqyJ9q6jfbEsJEr9ZqeGQt//NlPeTmw6cn75MXesjYJpMH78+G8hr6s1ehJwhqEw0qnEuprpwZaU/MQBnsVobfDDuOX5dhRpIIdDVU4=]',
            },
            VB: {
              key: 'GS[3APGRWBu5AzCXrx6kslbLlmuqSI05AxGmhoHBwY6NokCCgLZX9Ca9i/1N6GZo58aMHMC6dU8N+aH4s9hTqDGHQ==]',
              secret: 'GS[nvkTS0wxZ/kKQzEnnlWF44dJW6P1EbxRxtC6/Ny/pcDRwk1C+AnjDof01D9R9PP1I0iAfoKMGjZH9Bur+izyQO8AcbfhoT6qXh9HIAhdcI1X5cceoL7OClKyHZZO50DE33tw9V/Dabk=]',
            },
          },
          germanBrands: {
            CJ: {
              key: 'GS[LqS6PAzdq+JdlQ9tkil0Y2Y219oWb/vlZtkBPtzO43tXwMbkH1LqiJ+AweNgMwmi0JaVXQjB0u/UIl+pGuVc3g==]',
              secret: 'GS[X7187+FcRzJ20vUU840I4zUK/WiZ3CLZH2Ph1EW5jW42QNHfTQnSgvLiaySr+b0921rY2sEe6neYyeMjrDbzgB+AuOZEDdDXAi7DhFq7pdbcW1pNez8TTtLwo8P6wAGCG4u76kb4spo=]',
            },
            LD: {
              key: 'GS[sdFkRjKVa+DDzd0vXtezeubKM1c4Oc4G+YTZ+SxJviehFxn9i499Boz6mpsohQ51wAni1Toyv9muH+NGQQK8jQ==]',
              secret: 'GS[a1LkQ+qci+2PzB3peLhZSLI4gW7dywjEfBcCUnrUa2tVbnYA2/ShTXa0tTCtgA44kjUwWNir/mta0Ke4Y+GVnpt04jpLT6/M2VpDp6pYGRb/dHk9LISxd8W6vqu1efxqdDwLcpZ3puE=]',
            },
          },
        },
        callbackUrl: 'https://wallet.luckydino.com/api/v1/booming/callback',
        rollback_callback: 'https://wallet.luckydino.com/api/v1/booming/rollback_callback',
      },
      elk: {
        gameServer: 'gamelauncher.contentmedia.eu',
        operatorId: '7770472',
        partnerId: 'elkprod',
        password: 'GS[ZMBIUVDgzYsnETs0EBw8nBhn0v5/jBnWmK+3nSzN9F4lplZLjPRq9gQdRqm59KE7jWMfA6krCW8TQXy26l0fEiOgyD2CD9kV]',
      },
      evolution: {
        hostname: 'luckydino.evo-games.com',
        casino: {
          key: 'luckydino0000001',
        },
        api: {
          token: 'GS[KQ5gVR1cx+re1U+2NlkFouaG+IEnSShhDyYk918OVJGKN2yFBSYMz2rkjr4HSm23aIN7B++MCRoZQrgNWNOXty1XOFf3S7YFhryMLaWxGVM=]',
          password: '',
        },
        authToken: 'GS[zTiJAg4M464dvCzVEKbOHWpdvecbaoNW/Izacw7VOOL6E/cULeNCPFj1Gl5/mAqn1gJ8PLfg+cphaMCsfYsnRBEQE5FvvierA9UGv5/oUiHr+P+51tynOfTgGhCd3/nNN9+hK8GbZU8AdIHUn9ElxzTrdbIXnx5RrgfzvQeteqhUpgapfo4q]',
      },
      eyecon: {
        apiServer: '',
        gameServer: 'play.eyecongames.com',
        accessid: 'GS[eseZHuOsZNsdqq2XsMhCC5yiKPDcBj0QqntzYQxYYizQZwlLvngWU1fCRcmRpjPHusSaWiuDTRRvzVjp]',
      },
      habanero: {
        brandId: 'd22c9494-514c-e811-a94c-000d3a24d7e6',
        apiKey: 'GS[fJR67iIHE5j31PtCJOxAExAlBdHLon/XhUkrLvM1ziQghxzA/ZrMKvn54LssTXOjfDG7fdH/T6PfK/MFabTbQl52jN1oB+CDLyo9gw==]',
        username: 'habanero',
        passkey: 'GS[0ahRL+262HWOIb3x9eM6mOyrWjCWN2Y7p0EGHtgD0h+tm/7sBxfUFvVf86wu84k8HpU0sfYE+IlvA1DbYZ18Vk6qvD+7tdgL1k+KZA==]',
        gameLaunchUrl: 'https://app-e.insvr.com/go.ashx',
      },
      lottowarehouse: {
        gameServer: 'games.luckydino.com',
      },
      nolimitcity: {
        gameServer: 'malta.nolimitcdn.com',
        apiServer: 'malta.nolimitcity.com',
        key: 'GS[q3l4hBeyfrq2yOxEEElHLgSvDZ9SDJBM9OMVsh28b0dVAlh9q3Xvw7YpuqgXXMjBi3rOww==]',
      },
      microgaming: [
        {
          launchUrl: 'https://redirector3.valueactive.eu/Casino/Default.aspx',
          mobileLaunchUrl: 'https://mobile2.gameassists.co.uk/MobileWebServices_40/casino/game/launch/',
          apiUrl: 'https://orionapi2.gameassists.co.uk/orion/vanguardadmin/SOAP2',
          jackpotsUrl: 'https://api2.gameassists.co.uk/casino/progressive/v1/counters?currencyIsoCode=EUR',
          demoServerId: '1867',
          demoVariant: 'mal-demo',
          variant: 'MAL',
          manufacturerId: 'MGM',
          brands: {
            CJ: {
              serverId: '28348',
              lobbyName: 'casinojefeMALcom',
              login: 'casinojefe',
              password: 'GS[QfDgsjPwZF28ChuzIh+DhRRYY1TFy9iBY40tHBzkGhluTBvpr3VnN5B+TAKOJCBEa+4OWz281gYXLg==]',
              orionLogin: 'casinojefeMAL.com',
              orionPassword: 'GS[IwAyPwokJpCB8UXe57F2i2AabkyfK70B+Qt0x8Fg0s/42iz5UFn3CRHZMLUSlx8pKes=]',
              applicationid: '4023',
            },
            KK: {
              serverId: '28349',
              lobbyName: 'kalevalakasinoMALcom',
              login: 'kalevala',
              password: 'GS[BK/nlIq/jpIDWiSZk2bb2gJkqWp16wXvfZc/Kh7qdlSaGAsOeEwxv/luthahevYv6F4KN7BMrhRx]',
              orionLogin: 'kalevalakasinoMAL.com',
              orionPassword: 'GS[qjGV1zgRDxjnUhSBjggHCJcwy3LCgzgklE2ISHFd5vdUztfeqPEg1ns+tzdT4oW3vZM=]',
              applicationid: '4023',
            },
            LD: {
              serverId: '28347',
              lobbyName: 'luckydinoMALcom',
              login: 'luckydino',
              password: 'GS[uxm+CyHw+gSNXE4h36ALhnf+pKmbDMlHx0NdvErVRGAuIHUsEsIId1eBJ9b8UYPI2N8q6XrvWmJa0Q==]',
              orionLogin: 'luckydinoMAL.com',
              orionPassword: 'GS[iHfDtYWMJ8Tmsd7t9HE/hOtg5j92WtihSDavxfZQw7xGChNO/JJiEUlOy49T8XrLZRc=]',
              applicationid: '4023',
            },
            OS: {
              serverId: '28350',
              lobbyName: 'olaspillMALcom',
              login: 'olaspill',
              password: 'GS[/Mqh4hE335RqfZMXuLTNLHBo6ZT9ilF9aS7Y752VuXQRlh39wVV0hE1TPHNvYTyN25+If59Ca/5DgQ==]',
              orionLogin: 'olaspillMAL.com',
              orionPassword: 'GS[hGrOJVFMUQ4Vd3qUm9GSuQr1G16CnC/f7gZRPln6IGwTq59Y8ZVu79+kjqohyiwJSeo=]',
              applicationid: '4023',
            },
            FK: {
              serverId: '37262',
              lobbyName: 'fiksukasinomt',
              login: 'QFLuckyDino',
              password: 'GS[QniY8vVWhmQpk6dJfWZZ9FTHH5RTGY16vqXZCgjuFHgoKrjVYmFrXclg21vTHXXmxlI=]',
              orionLogin: 'Fiksukasino.mt',
              orionPassword: 'GS[xOOpvsDiVFlAQegCQqdr1Qy0lBIiGJShNRw/j1Vjq2xnX1DjrjcbaPHUrrY8FD9C1wo=]',
              applicationid: '4023',
            },
            SN: {
              serverId: '38091',
              lobbyName: 'sportnationmt',
              login: 'QFLuckyDino',
              password: 'GS[3YWrRdH4lpv1Qi3kAtDy7IV2tf3jIy3e3Az9eQUB4F7NuR7GXfPyBvoSOfxKw2M5ZCo=]',
              orionLogin: 'SportNation.mt',
              orionPassword: 'GS[B55k98QRk9enTgsbHs9c6E6Zm1MN/nMKeyNX2PB0mR/CifJ+G21vP/ztPrF2cE0IJxI=]',
              applicationid: '4123',
            },
            VB: {
              serverId: '38090',
              lobbyName: 'viebetmt',
              login: 'Lucky Dino',
              password: 'GS[3YWrRdH4lpv1Qi3kAtDy7IV2tf3jIy3e3Az9eQUB4F7NuR7GXfPyBvoSOfxKw2M5ZCo=]',
              orionLogin: 'VieBet.mt',
              orionPassword: 'GS[MVuaBJwgOo/Q1GkvmeB6dY2mSj+r4uRj5LpVLZXOj6fhryQ6kDKla9MVw/nAmtJjsJM=]',
              applicationid: '4123',
            },
          },
        },
        {
          launchUrl: 'https://redirector3.valueactive.eu/Casino/Default.aspx',
          mobileLaunchUrl: 'https://mobile3.gameassists.co.uk/MobileWebServices_40/casino/game/launch/',
          apiUrl: 'https://orionapi3.gameassists.co.uk/orion/vanguardadmin/SOAP2',
          jackpotsUrl: 'https://api2.gameassists.co.uk/casino/progressive/v1/counters',
          demoServerId: '3516',
          demoVariant: 'mit-demo',
          variant: 'MIT',
          manufacturerId: 'MGS',
          brands: {
            CJ: {
              serverId: '24200',
              lobbyName: 'casinojefecom',
              login: 'casinojefe',
              password: 'GS[5zohrkcP76h0m08Y0DE2o3MpDud3Jb1AUtqf7ApwYwqAPeT4qdYjSzEjBvMoLGaMWFDS1heMHjkxMQ==]',
              orionLogin: 'Casinojefe',
              orionPassword: 'GS[exKd2HtdMgFJbeMuVVVTAoVm3z2waJr/A9hH0CSlfVuAHIuRLyE83JWCsqky/1/dHoA=]',
              applicationid: '4023',
            },
            KK: {
              serverId: '24201',
              lobbyName: 'kalevalakasinocom',
              login: 'kalevala',
              password: 'GS[5eY7VSlQr84RkJAOT6hR2OLxkqPCPv4/dVC2wYnMfJVNKSDdkavPpvQQRUkhiT/4M5mkSjuxstlr]',
              orionLogin: 'Kalevalakasino',
              orionPassword: 'GS[g7FuqVgQXjUAsiMwTqL1hAd1PRRJeh2o8vfYwaVrHGMGoXW55TVg7CO5Zo2I6D8BRcnJ7jCQ]',
              applicationid: '4023',
            },
            LD: {
              serverId: '24202',
              lobbyName: 'luckydinocom',
              login: 'luckydino',
              password: 'GS[CjdrXwHCEosaO1D/m8CSyzujt9MsQyO53Fuj3gzSg7sxfMjb6bYVY4fqAmXLC56uLDXxzhKmTK+FHQ==]',
              orionLogin: 'LuckyDinodotcom1',
              orionPassword: 'GS[krboYIAc+LvG9SQFa7+ebgcpxe6zi5ryYSPj9/nTchitEyn/o/vwqF9esWfEE8S1vYcO9n++3bs=]',
              applicationid: '4023',
            },
            OS: {
              serverId: '24203',
              lobbyName: 'olaspillcom',
              login: 'olaspill',
              password: 'GS[thBVy23v8w4lfNWSI8veLimhDDq3xmV/Pqg09IxHCkCTG+VNPJVngfwEpbxqy9dtIggCW/Ht+uryYg==]',
              orionLogin: 'Olaspill',
              orionPassword: 'GS[I1Hag8l1gdpteZ0xEd8gauqwRzS5u2ikLV32Gsb9aO7b1Miu1f2zMUOU+TRCt1gU]',
              applicationid: '4023',
            },
          },
        },
      ],
      netent: [
        {
          countryId: null,
          manufacturerId: 'NE',
          endpoint: 'https://luckydino-api.casinomodule.com/ws-jaxws/services/casino',
          staticServer: 'https://luckydino-static.casinomodule.com',
          gameServer: 'https://luckydino-game.casinomodule.com',
          liveCasinoHost: 'luckydino-livegame.casinomodule.com',
          gameinclusion: 'https://luckydino-static.casinomodule.com/gameinclusion/library/gameinclusion.js',
          defaultBrand: 'LD',
          callerId: 'NetEntLiveUser345',
          callerPassword: 'GS[hDD8DyXmS43wWf/TDNSZ4yiwpsQ3ed2QbthcQKNTQIB35P7oS9Fybb8d5uA59j2j52kCTLh6l7pwM9VI]',
          pooledJackpots: [
            'megajackpot1',
            'hog_large',
          ],
          brands: {
            LD: {
              merchantId: 'LD_merchant',
              merchantPassword: 'GS[OAhv2/m/mOE733ZPwbXS62sjdDFRIz7kcaSbDKaDuoOkkhf8gnliCCc6iAcYlWbf]',
              lobbyUrl: 'https://luckydino.com/loggedin/',
            },
            CJ: {
              merchantId: 'CJ_merchant',
              merchantPassword: 'GS[H3gInWv0IviE4oN8B0bpefCxNjSdxvWBLfyNKHjyjx8t7N/uk0PuNWpypCyC4YyV]',
              lobbyUrl: 'https://casinojefe.com/loggedin/',
            },
            KK: {
              merchantId: 'CJ_merchant',
              merchantPassword: 'GS[kP4tLqENPjEo3ssYXFppgDg+OYMWn8j18Xqfq6L3AsfFErSGtoi4EjtRjDy5rZmo]',
              lobbyUrl: 'https://justwow.com/loggedin/',
            },
            OS: {
              merchantId: 'CJ_merchant',
              merchantPassword: 'GS[vrQibhESG4QS4b5Bevhups+kUyTeHGdFVZi0orDAphr3Vjs0aEIZ5eUuBPit4knQ]',
              lobbyUrl: 'https://olaspill.com/loggedin/',
            },
            FK: {
              merchantId: 'FI_merchant',
              merchantPassword: 'GS[FGHfMcURrPmIruHfOSvdXiBPZ/aH3R9XMiM2A3FgLsri6LZHEnH2Zx5W3zm1tQUs82ijBJsmuzU=]',
              lobbyUrl: 'https://hipspin.com/loggedin/',
            },
            SN: {
              merchantId: 'aff-SN_',
              merchantPassword: 'GS[WyoWtzxy29AII8W1qgCZEiAFP6HnBdorufRkhJzac9YTYM/8HAZCtpo3zMqHv1aA184P3w/XmQ==]',
              lobbyUrl: 'https://freshspins.com/loggedin/',
            },
            VB: {
              merchantId: 'aff_vie',
              merchantPassword: 'GS[8+LUSyaeM6FUfW0Og58qUT9cxuNwDFXtLGRz+gPF4NoSGrFFUCzxLS2ujetLaeM=]',
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
          server: 'play-rgs.oryxgaming.com',
          auth: {
            username: 'oryxluckydino',
            password: 'GS[9hbCkoNSafiQD8Q0T34JBICVK6UW8EreXgWcD5dqKylohrt0+DYHMqifDKw6ySyt5ZD6g3I/oRYBt4PbCt/9+c/VGP8bFVzOzMouFOKwvBa1aygXAOjv9qZY]',
          },
        },
        apiServer: 'api-rgs.oryxgaming.com',
        api: [
          {
            walletCode: 'CASINOJEFE',
            auth: {
              username: 'LD02_FR',
              password: 'GS[zniavU3jZ8/IZLx214H9nxkS+k1EjCYKyPBsdUSLoTe5/ZQF9jmV5C1Q0008/Cjaz6It]',
            },
          },
          {
            walletCode: 'KALEVALAKASINO',
            auth: {
              username: 'LD03_FR',
              password: 'GS[gvRiyXSx8GtecwRBlBmle0ujmns6c9NRVzprOAwtXDtvn6VXa5UpG22rUD+pzp5FnoQ=]',
            },
          },
          {
            walletCode: 'LUCKYDINO',
            auth: {
              username: 'LD01_FR',
              password: 'GS[2fBBKzYpjJljj4H+/3kR8LWPZzqEPupBrmIYf7ajdsLMpEAEMUIf531a//VxANrheaI=]',
            },
          },
          {
            walletCode: 'OLASPILL',
            auth: {
              username: 'LD04_FR',
              password: 'GS[wGWbbFTcoFuiFWR7VoAwpl8UWPEvjWAVMGk+a44OLkcblo4FiwJNXfybeZtiI6YrvsU=]',
            },
          },
          {
            walletCode: 'FIKSUKASINO',
            auth: {
              username: 'LD07_FR',
              password: 'GS[gW4j09Vg9l6bQhtITBiSgkPdKL+UmSiUYn41WZ6qU2FuPRD8KDlzV9h1m85zo8LqI00=]',
            },
          },
          {
            walletCode: 'CASINOJEFEDE',
            auth: {
              username: 'LD02_FR',
              password: 'GS[zniavU3jZ8/IZLx214H9nxkS+k1EjCYKyPBsdUSLoTe5/ZQF9jmV5C1Q0008/Cjaz6It]',
            },
          },
          {
            walletCode: 'LUCKYDINODE',
            auth: {
              username: 'LD01_FR',
              password: 'GS[2fBBKzYpjJljj4H+/3kR8LWPZzqEPupBrmIYf7ajdsLMpEAEMUIf531a//VxANrheaI=]',
            },
          },
        ],
      },
      playngo: {
        environments: [
          {
            pid: 572,
            accessToken: 'GS[y1uczLpRLTiJ2EYVSMESaEGpYb8GCdOx/P2+D0+mOQmVNjnDsIiiOy7ohcNWtXA4ibxTcqUbI/RpPgDViBo5cBA=]',
            mobileLaunch: 'https://bmtcw.playngonetwork.com/casino/PlayMobile',
            desktopLaunch: 'https://bmtcw.playngonetwork.com/casino/ContainerLauncher',
            manufacturerId: 'PGM',
            api: {
              endpoint: 'https://bmtapis.playngonetwork.com/casinogametpservice',
              auth: {
                user: 'ldgapi',
                password: 'GS[0kQrsmTm62Mf6yd9N+Y/Kqf3ngj00OsZmoDXrFryDzvQjyWi8NqwNbzlVoZKtcw0/xzCuTxH/S/JPkhhfVlD+TE=]',
              },
            },
          },
          {
            pid: 361,
            accessToken: 'GS[wRPQRR/RKlpSMD75mGdnlCAPQnUmCPqZEDuDAAf080LpvLA1hOwobX67uifq4nGKYdYrnTECqYIrVmWO4lApHEKva11D2tB6]',
            mobileLaunch: 'https://caocw.playngonetwork.com/casino/PlayMobile',
            desktopLaunch: 'https://caocw.playngonetwork.com/casino/js',
            manufacturerId: 'PNG',
            api: {
              endpoint: 'https://caocs.playngonetwork.com:33001/CasinoGameTPservice',
              auth: {
                user: 'juvapi',
                password: 'GS[dLnBMClIi3EP9JFZ26fsDhIlZBoxiaOYZw9yeb8BQ4DuavfB+qhlKJMMgqfuRlgM1F1txOKv/XYxlDys3rjGRSWks9qQ1BVc]',
              },
            },
          },
        ],
        brands: {
          LD: {
            lobbyUrl: 'https://luckydino.com/loggedin/',
          },
          CJ: {
            lobbyUrl: 'https://casinojefe.com/loggedin/',
          },
          KK: {
            lobbyUrl: 'https://justwow.com/loggedin/',
          },
          OS: {
            lobbyUrl: 'https://olaspill.com/loggedin/',
          },
          FK: {
            lobbyUrl: 'https://hipspin.com/loggedin/',
          },
          SN: {
            lobbyUrl: 'https://freshspins.com/loggedin/',
          },
          VB: {
            lobbyUrl: 'https://vie.bet/loggedin/',
          },
        },
      },
      pragmatic: {
        apiServer: 'api.pragmaticplay.net',
        gameServer: 'jrscvnt.pragmaticplay.net',
        brands: {
          LD: {
            secureLogin: 'jrscvnt_luckydino',
            secretKey: 'GS[E3G7MjCjaEI2AL/DnBdtbzMe6BgLteP8ctvWFGVaq9fK22HrbgUZVDZisgeTBKYmde07bJZXPfc=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          CJ: {
            secureLogin: 'jrscvnt_casinojefe',
            secretKey: 'GS[Ua+iZjjhEocoCHrkUWyGSU23ZgMixXARlyFFNemM+QWtKi6ExX+xU7PcE35dMn7XU2lzOvxIQcI=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          KK: {
            secureLogin: 'jrscvnt_kalevala',
            secretKey: 'GS[L/FnEzii881geIJf7boNSOYmlNSjhPtkg+nzGAR9SlFMumt+taUqCw/ngrBEkBxx1Au64o5tHSg=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          OS: {
            secureLogin: 'jrscvnt_olaspill',
            secretKey: 'GS[29hW2BJjdNn8CBEkNDpNPVTKoo85aXcRfBRI9afBV8CYE5GLQyDZclOND91Q57zsj1VaeyWWCtU=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          FK: {
            secureLogin: 'jrscvnt_fiksukasino',
            secretKey: 'GS[yUos/LJjYJQggqvbeLDaQ7QXVnvhMQuFLV6DmNxjxqDzUTUYTThZt7L/fleThVCxbwwPQJqqAfk=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          SN: {
            secureLogin: 'jrscvnt_sportnation',
            secretKey: 'GS[oJ7EwdXHuhF7e/12KXCeNl1ook5cX95ZLvvM5BftG0i4ZSK2k+cKwXyaVslxdAu3BGMNXKXdXx0=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          VB: {
            secureLogin: 'jrscvnt_viebet',
            secretKey: 'GS[oJ7EwdXHuhF7e/12KXCeNl1ook5cX95ZLvvM5BftG0i4ZSK2k+cKwXyaVslxdAu3BGMNXKXdXx0=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
        },
        germanBrands: {
          LD: {
            secureLogin: 'jrscvnt_luckydinode',
            secretKey: 'GS[miSte+fQ8E7AH2JiMRnjMCRCjReReR/Y3aQRfW9WwwWcY5O2apa1ltfFnlETnXk/2vlbWWURh98=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
          CJ: {
            secureLogin: 'jrscvnt_casinojefede',
            secretKey: 'GS[JOacjvzzXxTCNR0xXoJ+WfdJ4+bMQxrh5G23/Cj2/FX6XG3Gfkby/CKX2BpiYkwMb96adx+xLzc=]',
            providerId: 'PragmaticPlay',
            demoLaunchUrl: 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do',
          },
        },
      },
      redtiger: {
        apiServer: 'feed-luckydino.redtiger.cash',
        gameServer: 'gserver-luckydino.redtiger.cash',
        apiKey: 'GS[B9ZeGu4lsOUifcGhH7QLybX/rkjCmptRRcJeBDPfZDOVKYGflubtYV3+xB4+rR3uls+aclb9LZEsZJK3VLyeNtlIUeVjWkGo]',
        reconToken: 'GS[fS+5aQOF5wBod4Lth49Q6HL/rGoDNU1xgpVCyy21m4uXiwXCu7uLtoqE0YdkNlWXHCl1Y5+R4znq5c9I5pty/qFORYnyjd7G]',
        bonusApi: {
          key: '',
          secret: '',
        },
      },
      synot: {
        api: {
          server: 'neomt01be.syngamtech.com',
          pff_server: 'neomt01pffbe.syngamtech.com',
          customer: 'LuckyDino',
          secretKey: 'GS[4FW69t125Lloiyyqgb/sCCLIYqteb37x/eJaFwH+DlWSJhNG73hXcWANNZwKU9i+iHvm4i76e0A=]',
        },
      },
      thunderkick: {
        apiServer: 'tk-api-mt1.thunderkick.com',
        gameServer: 'tk-game-mt1.thunderkick.com',
        apiServerUser: 'luckyDinoApi',
        apiServerPass: 'GS[bkq1MpcsVlb7eS5P1wF6iRkutKiwaRdcX5k7MWu7xPc3cdLWjRyKVrwcgEk21/+ljqhy/3cD28o=]',
        user: 'luckydinoApi',
        pass: 'GS[K6FONbrO7FgMskmHKCVBhWjbU4d4zCuRYfeOjKGCRwic+PIhrz5jJ8m8Zi07kL80Gbi1nDzzDlWJw0RU9kgajew=]',
        providerId: 'Thunderkick',
        lobbyUrl: '',
        operatorId: 3013,
        jurisdiction: 'MT',
      },
      williams: {
        flashUrl: 'https://games.lon.casinarena.com/casinomatrix/matrix.html',
        mobileUrl: 'https://lon-resource.wimobile.casinarena.com/resource-service/game.html',
        brands: {
          LD: {
            lobbyUrl: 'https://luckydino.com/loggedin/',
            partnerCode: 'luckydino',
          },
          CJ: {
            lobbyUrl: 'https://casinojefe.com/loggedin/',
            partnerCode: 'luckydino',
          },
          KK: {
            lobbyUrl: 'https://justwow.com/loggedin/',
            partnerCode: 'luckydino',
          },
          OS: {
            lobbyUrl: 'https://olaspill.com/loggedin/',
            partnerCode: 'luckydino',
          },
          FK: {
            lobbyUrl: 'https://hipspin.com/loggedin/',
            partnerCode: 'luckydino',
          },
          SN: {
            lobbyUrl: 'https://freshspins.com/loggedin/',
            partnerCode: 'luckydino',
          },
          VB: {
            lobbyUrl: 'https://vie.bet/loggedin/',
            partnerCode: 'luckydino',
          },
        },
      },
      betby: {
        rendererLib: 'sportnation.sptpub.com',
        operatorID: '2077423606375260160',
        api: {
          host: 'gw9yca5f.sptenv.com',
          pubKey: '-----BEGIN PUBLIC KEY-----\n' +
            'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6Vz0hOcdFqVKZJ5wpdcb\n' +
            't+iRsU9ULHGI2LkpDh9uJfvAJL70fIsK4Bus6Vg5PqVjflWvmPTg7urY8LGUK6Os\n' +
            'EMTKnY/clexRf9CELsfBXNQpLmpx2zWTjvAnDeWF1Zo81imr36/2kk+9qtOAPD/o\n' +
            'ZNUyHL6FLLydG81qpkcV9Qi8j6u7QqAliG9/OHF9STMZTfSlAPkjEDNscMPYLiSu\n' +
            'fXZI/Wi6WrWWiYhCDi9NN4vy4t9GUf+dav3zcgsWTtC2wFJBlxVq66oJzRYgQ9j+\n' +
            'P0k41U0s0VJ/ptGSou8jfhWSXATpTI23lKwvRlhKmP2lknve2LY7RJ808lKT9l/x\n' +
            '6fEqhf3HNQo623E+4Tgxso7rqrwnRhYg+vwC8VABmgau+xiTEUPJeEaBzc2Hya8k\n' +
            'R2Tr6K4DFWYIPTrV6NuX8cxMubQru521ijhyanraI5uwel3x2DcDowUVaRw3MMOG\n' +
            'WKNXlWBYOTY3ZA+uItMTyWu+XCTSJUnWIAasR+rt2CJqHK/lFtSgxq2GU4vAOtwk\n' +
            'doabRIuqVKKdyLbC3Wm3I/DT7m490mxfJ7BJcHw++MPmWdCZ+3SGuJM3jI6ugb1V\n' +
            '3r2uruq6i83OEwZEKIQj6ndMY7xuEjaY1EgxlAuJ57o3abA5zONToPM7hbalsHEa\n' +
            'Y2msifce9VVvyZ1eU/AQdWECAwEAAQ==\n' +
            '-----END PUBLIC KEY-----',
          prvKey:
            'GS[BHsj5An1TQ5HX0qaMuINrZdbctoQ67raOwSF3mH9e5UBNwm7kM2DAt0AMx/5Y6eh' +
            'QsS1O4700R6eeVhIJJrd70LUSwl4Z8el5FmWkcczwrJ/17reTPRlrsuIjQaeH2rlLnU' +
            'Mj6XA7zGw3o+vbFf0Rb9HGJtwU9PZhm8PEGyry8RJxjSGYdoKtSq3vomHEJJrO3wIgX' +
            'oioAdO4IrtxUXyIbKnCnWWFKQjBKqA5r0gbnC+pwjS83FooRK11K3o204mD5cxYXp4E' +
            'UX2EDZ/Ni0ZulDNnYLE+jtqm4ski1A6At5nj5KXcZD3vYb/QwAxGvQyybKiyWmTtxjL' +
            '48pPff0eMbYdZ7YvwsVIGiZB4vTBYxRDsp5bwSMOMMIBu46+urYxjz187H4ljAB5lXn' +
            '6urTdeXR9Lxa1YqcA4odK0zACC6aRz9D4MZAeKtlfmyDFaUTWwz+DZdt5ap/oNn4/fe' +
            'g8pEA62EAnOtSeh9UTowonyMMZ1IIBI1y+CSfxYF1u3VJWZROlVJv+Cu5/cbwJltFT1' +
            'F/yKCOO62RcZ0V/MeeLoizXKKMNrjSodF1RQJYhQeiOw8uv3CMlMu0weQ0UBUsxvtdt' +
            'lt0DwSkZxfPT150Wl/yzCAltyDwXDAwMUl1PwjEQAokr+0SKPdTkND5d18uvRQK9FOu' +
            's6Rv+jZnu8d1XNf5QUtwnzt384DsU6Wu4tjYiAOvJUON8AmjcRpVOmkXML0znGBVbXb' +
            '9Vp99c2dCglvrOU9v2TO0/xwVxI3ia2MXt/RR3ftgq28X8/IhbMsDlXm+2GP9ihnvOD' +
            'krywhEDr7kZJzV1qlpMXsPf1YLP776I7zXsaj9EIJvvvsJpLcY2MNAKkl58t0+ATci7' +
            'aEvbzFLlQV1nBXbCfKbLMpWIf2onwWi1rhlMUjxKN/EestqWCZEuTdyOssYgVjpiwfd' +
            'BxTMsNmtzBGhrjgkzH/yBduDPlvKuOCmje8GVgrnmLZ/su5FnOqwNJK/oKdiNtwyDP4' +
            'evdwfwkiaIi5hHB7PS7qG2F1GQUh4lSrkGS2yuTxsBYqUFTZU13XyRaNdRbOERgaZoA' +
            'rCZTnFFd0Jh+zyznMvh8hdySGb2ZWiw8A0BF68oJ8rM3lUinlGq+dIjGyilXR6savbg' +
            'BPymTGrWBiTIc2NWnnQw6CsweU2tHaMt9FOE7f2I6DfR7Cjku3CF4LRjrZ78iYBBfvw' +
            'fodke7mQ5BpEdnk9Gsq9a7yELbJu9jatLyFpK/aCxW9q3NAiH673ih/+lMSzN3zsxIf' +
            '/3BZiLCYHV4nry2fA/Oyyvh2+iVVZBUl9XlYHGbJGoC0dDwijjgUpH/tqYk8o54uZKd' +
            'VNgROHYYkN3pJyeMwnl6fA/IL4SgYIkxw/INMwnzn08ZOag9WZKRwuk8PrVs4p1PCQ+' +
            '/N36Iy1ENxWxMbCoJ/kAJyU9eQVUOrp15k67gBq0lTPpjeze8L9YNGvQxsbeZ8fbxVV' +
            'foe9lQM+bXNUSIuWr9cErJw5hM5/MEda6dsXvcCmEqkAFdWPQKa2WxFnyA0vkoWlrPL' +
            'FO3x5Wk/hSYKgj3m3cHU64E95aN8IjUI38N8/Ivf8GAelkg/AXGtYU9P7y720srb9pb' +
            'Jg4mJWhxqYGFCh++VkHbyXgemHTOztjn21hgqMzLXMPmTEZy2H93MK8BVFxPktmFWx1' +
            '1c/DU2kJrEKVed26ugKB0P+U8Xqyw/V0d9Ic8VZQg8MTPL5ingsBNaITN2REg82Okcj' +
            'gqJ21brh+M9dxvVm/dTI73e/sK5g8jenVF/zvHPH8kT4mPvyzfi2Fmuovc2j7lChB40' +
            'HcEselz7FeOc8rwRvfpN6GT+KbjkU2/e6AR5yZ2YWZpJXBpKcqph1CTGjbkwyFE9u/S' +
            '0P4cbWyGyyMsUL5oJCrQYaD36z9h/DlvDT+0bEiq2Vo4OAz92Pdt7d36mxiup8rikJI' +
            'PJzJ+Q348Or+jEFM8TUw3lnZDEfnFF918fFec7mJMEPBqP5zhSX36BftbT7tYx8hdDo' +
            'S0DRwDlOoi8XBSwlYoGXNipAlDaHNSRBTCj5/v4gd7+H1iMdH48DNd6XqfLdAQRw6tx' +
            'PAfHDkUbeIgBAhYpX2R+agY1rMPcHRbnPPRgaRgP2fSX5k8FvKwnbeUYLP6C17099ij' +
            'NoFHGNW8Cy4/Po4tTa5laC3Og9Ewq+uLtrYP7ebfbDhCVbpzWxzvZGBzSOqGZjMyvFt' +
            'Sil6b1peCt2omowQIh2ueObU9PdunhJIkdXmUTj5F4zlBo39iyKjeddvj2eAG0D/LNY' +
            '1wPFUiXkTSoMhx2U6cvvdBx99KuihzUth9BvhYU0m1dAiu3TeM0E9DJ4FV1R+B/ujpq' +
            'LBAGlMGJ8IprNr/+g05gF5DZG4fxd9BMcbDo/RXSZRNDS+LYpNZNPoCGMxvO5+7YLxl' +
            'YXfCGMsud/ADF1/fs1WxJANiESqxxZ9AMuIRs9D0yAPFr6pcOr5/IkKV8uICuhACsqk' +
            '+lac8NMDvAjZdD81XSccwFWVb7tOzRRmwBH5bUYbqUbEO/y5sEXAEaOV/rep/WTupAP' +
            'UEL5jtfcOqE1zAnS+pi9pE9kzMrUfcHQ2cErxcaYMHYgDnGx791+s7MqjlxDhDOgnOq' +
            'KZv4WGMhFYq5220SVHTrJAdfwKkR3SHtycvdJ5H7TnVVg0mAPfOBHlH11NNN4a3yDMr' +
            '4vw/mVgPOHHmliW9ckMYqEENGLJMrRBwx7vrmyD7iBHL5uK22ACX46wuZG5S8NmHwf7' +
            '9fMYlsG6NDIaUdpKof8kiT98Fo1uo8lxZc/6+7pbd3ktAZeIxwnWKP81J4gzgo32txL' +
            'wgkbmVoZwjWIXV6YXtH1imlXYhXcI6qSEyeymL5cvLoyYkTf07KuMz7UyhCczsNS6xp' +
            '0PPukNnwq5NPYOigIjVzCsGDuC1Qc/jrKjWnFvMtml4zawDmobBukMLML4owTI80SOB' +
            'ris0SiaMDRuPMbcPvkKyOu6AfkJ6BfuOfIM5DXNYAOoTbO57ab5DwUofwQYjtUt1K3T' +
            'ZOhuwxe/BVHx9jEfO+mN3rNeF3EBTMP0sEkRlnSsLcSwaplNPvKG0XIkcQsRai+Xuuo' +
            'mNy8+WU9KLLTqCxf3bxIlahKe/fY5biBGudhG6oCIw6CaJTrZepegCKWLqkkAPXDyCm' +
            '1YRW8iHXeHiMePaSNNT5GbaPQEoyhWmkFXQF8+iJCnB48hj/OFXw8ujsprInKrCJOi3' +
            'vki3Hqmq8a+cdTowNjqq7pDiFJYdOxJrVo0RC5d3qqzZ1AcoAqj/hGT6clz6i7heiNz' +
            'VTSkaFEsz5AVebcvV7i2FLTCKeaPtjnjdn2+iXHjZIey7u3IAmueaSoDSIDJa3sbikk' +
            '47dd2raXxkXbJrHe6eXAZsdOvmJaujI77f7GTHO1QoNbYoGG+SubWJKxE5/7QpM/YAR' +
            '/i9MA5SLihzE/qBWvw2a7ZSMnYrB4DdHQTSqghF1u9ppKqaTcbi200adIgqWcjCpkz3' +
            'UyCAK8qwiHz+ur+MwdRSudv4uzchziptji2QKAB0EVRsEi4LFOYhkry9k7LPFzgoxjb' +
            'bxLp82p/VFVL2PkuBXMXsc84+0ShL6LoOpWTq38dn5Hz9ZQFYYeV0NDeNivZfFMxEtG' +
            'IcxesAJr7e9mmIt0XXy2lvO8S+zaPZhZSozvG8us4cVHUItiF9WoZ/GqmenWRGqSZXh' +
            '/xX/4kSTEtQFEahds/plt9JwP8hzOESr5ZevYkyd1GgJZIdF42Fw+lLUeaP6Eaklaee' +
            'GDpkHnsPgSR5g3oUhaCYhOyn65uGeOVXSkevE5OPsSYHYkWapIQHPDDV53h3l2xqun/' +
            'wozG6wJSITm2wzhuiIM20H5fvyzXF6/J+vegcODSgT+ZuN+mIl9bMISC6y65oiLGZPj' +
            'pgCfgJXO5nXBHN8YbfeOMVINPOgj3R7STN6i8AM/AOEYN5vXdFMlZ38N8SrCDxxFOMs' +
            'qldeqSaOD1U9DOTCM/Fh6ssNOxv97HKkZKT0EPb3I5W2P0po4+8WFY0b+HUunzFke9+' +
            '1FY5iOWo8Qe+xAjty4t1depJI8ocdZZaHH8QI8SpGkGBjdyXnxxkkHiHbqwUMMF5iwJ' +
            'idoWOnvelv+sH6qkSMu/+CmXw6f0IUJqukqIhGFM/zIQKyLN8+dhfPpqJRfCL/Bq7CU' +
            'btTSQPqYVGmhco4TT66KkYY8KRjZ/OicFDBiIkyvedgEb29ve5bvTWQFOS+kjcLdVD1' +
            'XtXraeRdTZ6m6Lzh+0dFZuesC7dSI8pqL4mmDR9OC/UJHLWCB0W250NTfaDO4IHh1kv' +
            'gfQoS4PjeysNaOARMIbg+oynucbC5LnujI6M4r7iw/eDlikc8MtHpi/Lzz9KWWwL0H8' +
            'OE97bGt2QvUQaZct/FzWbFkmrg==]',
        },
        brands: {
          SN: {
            brandId: '2077423929386999808',
            themeName: 'sport-nation',
            pubKey: '-----BEGIN PUBLIC KEY-----\n' +
              'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxmoEbHPj0ZRsFFltCUup\n' +
              '6UiTw3rebbVyGcdhW6YlNdHF0TCSiZ8amkj80g3MKSirLHv5+vhp3dcVImhIMy50\n' +
              'I0vNRMZZ0QyV1FryRb3zUNEsS2o2X3RIyeDpNZ8BRIrONb6wlSwf7B8CxZLc/B/w\n' +
              'pMMma/UojaMinPb8sEBNCt33+DVcUY9oEXEAL0KCZ105qj+6p5l1hEu99OgsK8XY\n' +
              '8Tc+XOruwLh9vY6ZxUlHFBG4p/EJ91ndeKWiZVvA4MQk4f24wyDlDFLB8r+tViI5\n' +
              'ECMTTwQlbrJQzz7uP/qjiCndUUMd0yMhrMQHPmpUB8QyOLETA2BNSUs7W4jjnukZ\n' +
              '4G3K6Y73Bk5LK7w3b2eTex0ugtwJYpNgbwKXcBK6uKd0nyZFQUYzaIY+SZ5B7L9k\n' +
              'UhBbL3cKJnFZl53k1M3tn8d9KmO4GhV/FWmwHTi/xqRMrHrccyaFj0Jfte7zVvET\n' +
              'ONaRHetJDKQRMc47ul5CUrbGPDlzP7o8f+OI1K0yxNM4+/AGFaizqKoN8T0bmdEI\n' +
              '7+QvgD4CYoIVE8SqqLQQZVidNuOeiAKjQ9DtoLqZQzbo/BvdPAzUY6lqOwji4iMZ\n' +
              'O+Hdu/ykDrB7f9rwXKtSNFunaBbLIFrMsxI+Xq5N95utcXbBooG9aVPLdg4toVIs\n' +
              '0tSKKXgbht/k4aMtXLpD1BECAwEAAQ==\n' +
              '-----END PUBLIC KEY-----',
            bonusTemplateId: '2112599543324487680',
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
            brandId: '2078151513133420544',
            themeName: 'vie-bet',
            pubKey: '-----BEGIN PUBLIC KEY-----\n' +
              'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6MSrozj5puQ/00tcLyFT\n' +
              'pb4dCGmSajMhIkhR43wORQfbQGdFoVqEaGOtGbJfoW9oVG4ud8oJDDoQAAguy7wS\n' +
              'UP/iBEtd7oQbCh+69SLVUQU7fLPg8v9REF8m0UDXj7VtWUApGdN3uGNlL3WEdHMC\n' +
              '66VshhoVElNG3aLx72kT7yIhb/z+5Yqs1kLeV96GFnHo8tyrf8Ijg8LIRiutqPmw\n' +
              '+JXyYgmqrAyxPjerZp7q92ts0qi4Xf7e5NYDFUEWayVNU40aGFkuWDrP9SWPc0st\n' +
              'Fsb1y1dnt34eSEv8xHvvSdyKaE4S+oyLx9dt91Jjp+WTDF4dv2qKopO7PnLsvOct\n' +
              'FZXYm6Gi9056/CUByPnJhh1i4p8OwXfFyeeNydLMI4jh2rXtY9z2i1Yx9CBf7Tbj\n' +
              'JCcffJyHxo9+m1ETkymki0q9v80nbhRE+XKpFdkk6RxZ0k3hUtMO6Gs7SUx+adKw\n' +
              'EU7ETIOYd2p3zowfTfKYMAcMgYn5qODNiumduss968MFCeCkzjciM+kvMNsnhaoE\n' +
              '8KOOeL//1B2DrR/QJ9MrJhYEaBUeLCj+TXEgd0v1f9nkDww/cV0YUdTyby/Rb6KV\n' +
              'pSWbhrxInrQxGVvZI2/+hWQQUH9h8p+jDOPTrVVUiM9BuPKcuQiN3snckxQTT9eG\n' +
              'Bn6arl6F+b6bFo4Ek8OiY9sCAwEAAQ==\n' +
              '-----END PUBLIC KEY-----',
            bonusTemplateId: '2115845047558737920',
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
            launchUrl: 'https://staticlive.yggdrasilgaming.com/init/launchClient.html',
            manufacturerId: 'YGM',
            jackpotsUrl: 'https://production.yggdrasilgaming.com/game.web/services/feed/jackpot',
          },
          {
            demoLaunchUrl: 'https://staticpff.yggdrasilgaming.com/init/launchClient.html',
            launchUrl: 'https://staticlivecw.yggdrasilgaming.com/init/launchClient.html',
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
      relax: {
        api: {
          gameLauncherUri: 'https://cf-mt-cdn3.relaxg.com/casino/launcher.html',
          partnerApi: 'https://mt-casino3-partner.api.relaxg.com/papi/1.0',
          partnerApiAuth: {
            user: 'GS[P3Rdxg+94M6YEpSD+Be4rfb8S44BbC9+RG1qsusQYiHJJ3y3FaqswT4mYQ==]',
            pass: 'GS[Uh5qluvtLUZoRjchQkGQm5BY9HuPWfsfDv2hH/zixXUuDIDfu4zuzzfnaimFXRQFpGJ/kURV21k=]',
          },
          partnerId: 1735,
        },
      },
      evoOSS: {
        hostname: 'luckydino.evo-games.com',
        casino: {
          key: 'luckydino0000001',
        },
        api: {
          token: 'GS[KQ5gVR1cx+re1U+2NlkFouaG+IEnSShhDyYk918OVJGKN2yFBSYMz2rkjr4HSm23aIN7B++MCRoZQrgNWNOXty1XOFf3S7YFhryMLaWxGVM=]',
        },
        jackpotApi: {
          token: 'GS[++tEfXslNhfb5TwcZgyTl3xg6qH0qoFxEX9fMkmS/Tk6OwzSkmpoEJLqtsXZ/xcMnep7zI98E661Qk2mOECcSK5i7Uz2wxfOWZFy9tDlJD0=]'
        },
        authToken: 'GS[zTiJAg4M464dvCzVEKbOHWpdvecbaoNW/Izacw7VOOL6E/cULeNCPFj1Gl5/mAqn1gJ8PLfg+cphaMCsfYsnRBEQE5FvvierA9UGv5/oUiHr+P+51tynOfTgGhCd3/nNN9+hK8GbZU8AdIHUn9ElxzTrdbIXnx5RrgfzvQeteqhUpgapfo4q]',
      },
      delasport: {
        sharedSecret: 'GS[gqXxDy58a/o6FPcnoH5I+KsPq6v97uWQuiatcNNJxzaKt0bBasMz+hgM5IvWHQbvdZ+wykcO0oAA1EW5Lw==]',
        iframeUrl: 'https://sb.vie.bet',
        apiUrl: 'https://api2.delasport.com/v1/json',
        apiKey: 'GS[wInOjKu5tn8gzkw8kCxVaSsNb4U/yMRYSwdHACGSZL8nZIYeLRfhsXmCPJXSxmru42jJ86MnIFTKdbvyTpIPrjveYBtQ1nj7JomVA6DtEzHCi7+MPF4mG8adLKprWmPvpHEqnw==]',
        apiAccess: 'GS[BdrJPFLp+L/GC0yVHUYbEfMkk0dmmNpIoDLfnU419dpaws4gBwQOCYN53RifNWcE5wgR7+NE97BPl/WUsH8dY81kv0wqSnGHLDVmxHydVKoky6JAPKqjWp+VaYcJC2prp8pUoCXbIdlaaVp6oSIL5FjM2Fd387GgN6zPx0RAQMUriQIbpmv3H0u7mbw=]',
      },
    },
  },
};

module.exports = configuration;
