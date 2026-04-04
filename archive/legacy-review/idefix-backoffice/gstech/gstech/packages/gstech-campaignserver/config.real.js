/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { CampaignserverConfiguration } from './types/config';

const config: Configuration<CampaignserverConfiguration> = {
  publicKey: '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    sendGrid: {
      apiKeys: {
        template: 'GS[PIxJADJ+1Knq0dh6LqCm9QONeCbXeJolXowcXHjb0lXApvHhH+FikBm6zonP6jS0Kzf5LcdoG/Z0g/vXw7Pp2ia2HGAO3jQ2F+zdci3I+YsyQ/OIG/qafxPl8WaIikLXkWKgQBkZsIlk4eNoXg==]',
        send: 'GS[+CoPzVAAJKmEqEEhU97+Q6OTAeqnUjIZkmvjAJ+4AWM9IOaBipvOdYzgik+zC/xOsUoKUgAY5oWPzlA1VEm0+G/bbJ+IhD2ryDtbU7zJ+3UTuRgBZOERdBy9Iw4FHi/pCZxiSo3Ss3pXf7JXDg==]',
      },
      KK: { templateId: 'd-6fc7a508574943939a97031e0e22a7c4', domain: 'justwow.com' },
      CJ: { templateId: 'd-cf306b1fdc6540e1803bbd5a0e9559bb', domain: 'casinojefe.com' },
      LD: { templateId: 'd-15b752d84d11460cae9c84d7501817e8', domain: 'luckydino.com' },
      OS: { templateId: 'd-81d863b4225a4821b5d3fdbac6f01d66', domain: 'olaspill.com' },
      FK: { templateId: 'd-a9d45febaf7c45cd97fc561cf8321b75', domain: 'hipspin.com' },
      SN: { templateId: 'd-aece952370c949a59fdde32f2f641960', domain: 'freshspins.com' },
      VB: { templateId: 'd-c81613a5685b4454898b62eb61aa6aef', domain: 'vie.bet' },
    },
    sheets: {
      KK: {
        campaigns: '1A_4dUeH9qUW0Hckb4JXORcocHcLetoXaqPxZdBujVAM',
        landingPages: '1hipuFvxYbjGI9Uwc1LfIPjsyt6SpJxI0Bqnrhnjl6DM',
      },
      LD: {
        landingPages: '1wcqRBWM7BtcRwOiMjiLPalVfBu2cEMWjyv7S63Y5lAU',
      },
      CJ: {
        landingPages: '1Mi59yoKWv19Be8UNiLudgt6fYYaxMNH34NJZGmPW38k',
      },
      OS: {
        landingPages: '124L2TFmIXCAF_X16lnzGQ-EmiizpE9dfLooKkThbak8',
      }
    },
    google: {
      api: {
        cache: false,
        type: 'service_account',
        project_id: 'idefix-184208',
        private_key_id: '64469b707949d5c4118a98d83cfd20e25f95370a',
        private_key:
          // eslint-disable-next-line max-len
          'GS[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]',
        client_email: 'brandserver@idefix-184208.iam.gserviceaccount.com',
        client_id: '102430615635003475635',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:
          'https://www.googleapis.com/robot/v1/metadata/x509/brandserver%40idefix-184208.iam.gserviceaccount.com',
      },
    },
    contentful: {
      OS: {
        preview: {
          accessToken:
            'GS[4+0ROSeRYbUS3t04wdfLq9nb3Ef17rH6rvb26NqQ1LIxHJVV4IBc++Y/mjqoDVdxAJ7Q0CZePmVDJsGh3utEdU7iI5U0IODOkVzltgIxWOBz5t4=]',
          host: 'preview.contentful.com',
          space: '3tiyadjidkkt',
        },
        delivery: {
          accessToken:
            'GS[u0Ixmq/eQRIRPArM2b7FtNr7pwgeaCDp3z/dcpRWLOYYwyWl3y5ArHjoFKp5a76R3QRe0yj8O6TPT00uPyItyFlQQo2PSGRqj4U89HePkvUUT2E=]',
          environment_id: 'master',
          space: '3tiyadjidkkt',
        },
      },
      KK: {
        preview: {
          accessToken:
            'GS[7ku2JUsnYrXj3JlpyRU/2TGBWRDFMAxbCgzsyFUf0+Ee/NQpZ6b+MjixdI6mRWmKjs9NbRAQC9JeosqRYQZy/YFZ6v9W90OZrfx1N1s0760k6nw=]',
          host: 'preview.contentful.com',
          space: 'r4zhhatpe62n',
        },
        delivery: {
          accessToken:
            'GS[h7d2agjSYK4irWUz2w7VRc9S7p6aXWB+Mw+ymuJq2ephAxO31j1sN3NSkWNh/CyMgtO9igM7FG5VQVW5ib1gCnzA6gAzQDlAP281z+3W7jh2/x8=]',
          environment_id: 'master',
          space: 'r4zhhatpe62n',
        },
      },
      CJ: {
        preview: {
          accessToken:
            'GS[norc8iIFrauW6TnVlI/zL/JEZeijIu+eF7jB10DNn8b5HF2PpXgBZGktVf3ThexForZpxmYR1bHHbCU3b/FoIgUTHDivmUUktgx7MIaFN1UoM7Q=]',
          host: 'preview.contentful.com',
          space: 'rch3pavcqb3m',
        },
        delivery: {
          accessToken:
            'GS[WSF7rO7KnnjRV+rm+PvhRN7o0SXA+qzzJkUPSqyIswOFPhJjJbqvlaOc25gMmiWXKyBcO5OzRwfWwW/YtG4/hwST30alB+dAHFA/RnkY4x4T26k=]',
          environment_id: 'master',
          space: 'rch3pavcqb3m',
        },
      },
      LD: {
        preview: {
          accessToken:
            'GS[+U7WybQyIkXLGrr7TwTgNH3KHqjTccWX+ndfQJZ2X9buxnPvVNBFcfynDpiYUpBQo2CtFxPfZoSPlNdrcYZFDX6c/F7mHHUuQvYQrIlhJNzuctg=]',
          host: 'preview.contentful.com',
          space: 'swqbqf22teq9',
        },
        delivery: {
          accessToken:
            'GS[qLGGHCyp4W0U78yRr5JC1jvlVeXdmz9aQi9ltNg2Bc8/1ppp0yF2/UIbPsT3hFt3QyThZZUoVgDC1y4l/gsIeEErtRheGDDDK9kN7EW06Q6uPMQ=]',
          environment_id: 'master',
          space: 'swqbqf22teq9',
        },
      },
      FK: {
        preview: {
          accessToken: 'GS[gS0gxP4wyTJKx5Bb92deNPNWUabvjGvjTe4NXkhVv/HPOFdg2XAyahr3VW8QmOPpBL4X01F74BSqulpmc16aJtRcodmwacMs1jrzmYqc5J2Cy94=]',
          host: 'preview.contentful.com',
          space: '72mfecpwrmgl',
        },
        delivery: {
          accessToken: 'GS[h23cMQTUib8W1NshcNtzyI2LIYLg2gPa4Vy1C4eDnw8zg/TZmLIaRSUIZh5xJO77uTHyij1xmIGs4J+xFKjKht/M+A1ol/zG5ayqh13ap4vqEjY=]',
          environment_id: 'master',
          space: '72mfecpwrmgl',
        },
      },
      SN: {
        preview: {
          accessToken: 'GS[O+k1ivpYwJo0weLY3JK4W9PxzZTVwIHytGWuyIBx3HquuNVcSKlf4r7xsSn8U59IpKPs3sYaMv0quzabs+yUz/LeJ03CGfsV+VuY/07jOoMAbpg=]',
          host: 'preview.contentful.com',
          space: '21wv3h4ix3ge',
        },
        delivery: {
          accessToken: 'GS[EY8P2NJf8Zmq1Nd6cjjZ/wy1PhGOyPwEfeMU8PsKdk1Y2nOgLiawLje/7KXNjaLpNPY4tGaz5YYzd2VxUl4lZm72zsJWKMZfpRfhHSLErq2BchA=]',
          environment_id: 'master',
          space: '21wv3h4ix3ge',
        },
      },
      VB: {
        preview: {
          accessToken: 'GS[Wzdy9TdtYZfzzYlxgvR7xPOqGVXqE9jkJ2ioi6N+Omo7uO24Hr6271Uu6XtJYKustUA4/anyloQXg/l/63F5d7cZ+ih+DPCXw6Q8jl0wNONf1NI=]',
          host: 'preview.contentful.com',
          space: '5zbcxnn2cyg4',
        },
        delivery: {
          accessToken: 'GS[XM99qkXK3CgRedIT9dfbgZZKD7Vij/C4Cph3CGnmXVZ2cxz+0ShHo/jvWTrViin9NBCc0OH5TdNFEy3tFDaKLVCQ7mmnfTL5Ea19mBzDUO5BRBE=]',
          environment_id: 'master',
          space: '5zbcxnn2cyg4',
        },
      },
    },
  },
};

module.exports = config;
