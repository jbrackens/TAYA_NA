/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { CampaignserverConfiguration } from './types/config';

const config: Configuration<CampaignserverConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    sendGrid: {
      apiKeys: {
        template: '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',
        send: 'GS[J7fFZpEhjYiscLYD5RTF1to3drkCrQkbACXyQVbSBgS+MkTJLQMLgbAhzkvBaXjsgGSGQo2vXorWyrNjE114GTBqjdjAsDBMXKghsC/jeNtk5Wr+Ic8ak0zkn/nHi3PddUuUPuvabq670EyIxA==]',
      },
      KK: { templateId: 'd-6fc7a508574943939a97031e0e22a7c4', domain: 'justwow.com' },
      CJ: { templateId: 'd-cf306b1fdc6540e1803bbd5a0e9559bb', domain: 'casinojefe.com' },
      LD: { templateId: 'd-15b752d84d11460cae9c84d7501817e8', domain: 'luckydino.com' },
      OS: { templateId: 'd-81d863b4225a4821b5d3fdbac6f01d66', domain: 'olaspill.com' },
      FK: { templateId: 'd-a9d45febaf7c45cd97fc561cf8321b75', domain: 'hipspin.com' },
      SN: { templateId: 'd-aece952370c949a59fdde32f2f641960', domain: 'freshspins.com' },
      VB: { templateId: 'd-c81613a5685b4454898b62eb61aa6aef', domain: 'vie.bet' },
    },
    contentful: {
      OS: {
        preview: {
          accessToken:
            'GS[VgMfcWtG9Zsu06G9jy+t/BNQO9WIZAWztB1jQeIqTchNnz6JsXZx8xFQIoZ17TWtcSFTeQRo3YGGEAplHkszXjJTP/NdFxdQAb/eQDrN5NYTIeY=]',
          host: 'preview.contentful.com',
          space: '3tiyadjidkkt',
        },
        delivery: {
          accessToken:
            'GS[nF6I8bPA5QLpXEzf9uX3NfgY1hzmvaYZEIRoeZkIrkG181ANGoc3gSu9e4tplm0Fl5gyE5pfOR2j27VUtFc4mQsA6i7cFnzyccDu+W6zWnHfOOA=]',
          environment_id: 'master',
          space: '3tiyadjidkkt',
        },
      },
      KK: {
        preview: {
          accessToken:
            'GS[UKMqArb2kS/+M/QjWiwTGuZgf1NsKeXRhOsGxKLRfDcfCKpTj0dkbthY8w5pzADaV5mkbL5+9kkMCNB/WVOIlCkyi80KjSvMjEG96w4ZIMJXf/o=]',
          host: 'preview.contentful.com',
          space: 'r4zhhatpe62n',
        },
        delivery: {
          accessToken:
            'GS[8cvJ0wom/jcf+epfV1kDiuAfKVKnrZtSCVgs4bmEkdTQshnezjRXbBphGn4uOzDQ4zoFWYJ7NZ9mZ5SyBupk6KerBoBzI/f62MZgLMyL+1ijUqo=]',
          environment_id: 'master',
          space: 'r4zhhatpe62n',
        },
      },
      CJ: {
        preview: {
          accessToken:
            'GS[8s9fIeXH3dT18J/cXMdOPkoJ/lmTMbJ5tCmVeK2UPmnNyaoXwqnnzFuCaPeTQ5QuUkmtebxDZPa15Cby0tt3pL1dkimuMVHBUoECuY9z7ilclDk=]',
          host: 'preview.contentful.com',
          space: 'rch3pavcqb3m',
        },
        delivery: {
          accessToken:
            'GS[Riu/UNqbQzamHmB3/5UtI0U70VCm+ZdgTO4/+QkDtgNpWIm/Npqxgzws/tIe4d0C6RxrfOq8jC0ODa/f3HDpPF5+8D0/e3Kx9Y4eoaKj3kR+mKs=]',
          environment_id: 'master',
          space: 'rch3pavcqb3m',
        },
      },
      LD: {
        preview: {
          accessToken:
            'GS[6hkdu0oAIJn41CEswSZKxRs0Qf8FVH0eFdu3BI05vb6692lpGZVycG8McNd7VBXmxFP8fX1uJm/08KEy5zey8l2uOBZbSG+76yDOJjDoA5gTW30=]',
          host: 'preview.contentful.com',
          space: 'swqbqf22teq9',
        },
        delivery: {
          accessToken:
            'GS[kK0qQo8f1hLAI2eLTBMhR2hNpyQr/WcJBPSxuPACuGPRk1kvYsW6zDg31k803cs7mXLK2liaI/ZTgtxz8v59NYa69IEGwm9dkdt2poilObncPk0=]',
          environment_id: 'master',
          space: 'swqbqf22teq9',
        },
      },
      FK: {
        preview: {
          accessToken:
            'GS[aV1jEdZSL4PuUM/RAAB4gwtPlhVQS6wuvrerlUb8JuZIBplTkKw9M/PUXjGKtlil0eE0nX1DDVRH/emgxC15AvKWnimUb4lX0434QeHUPamWWJM=]',
          host: 'preview.contentful.com',
          space: '72mfecpwrmgl',
        },
        delivery: {
          accessToken:
            'GS[v/fIwGsxRlTS8DnUAiZc13gzzEO6qpaAI26LVb6UEMMvQ/TC92IQ7bxrlnqEQucjHpazizVQDfAvYnxWuiyiHgwuvjESpkahBiRL3PjyuglC3MA=]',
          environment_id: 'master',
          space: '72mfecpwrmgl',
        },
      },
      SN: {
        preview: {
          accessToken:
            'GS[nVYpTOBwfFdnk4dtuLra6JSEavcX4K1/00e0KnGMtWiAwMRMy6mg8sfEyQkIPQ6IWzrHUMv1U4ilOusnIWKjDQ4tqa04RMeEfLMhdTnYX+ctx+w=]',
          host: 'preview.contentful.com',
          space: '21wv3h4ix3ge',
        },
        delivery: {
          accessToken:
            'GS[BwZ+wBox2ky5gk9tNEnH47l44VnYPtKMHM4mVahA8FZb6NJAcna3KBHdN2P7kGqPNU5/E87v/QioTAao+BYKSUirTLE5tVZJnloFfsZWwSDuS8s=]',
          environment_id: 'master',
          space: '21wv3h4ix3ge',
        },
      },
      VB: {
        preview: {
          accessToken:
            'GS[WsOn7c9M2SFU7Xn6GDXwU6wU+FTFWjEiV0ARV967WcoVhq4SvPgSVUBku1Opd82LQ2wDBT5In3npugcuJ2lVnY0bxWLoU39eteVPvHwFCafxqR0=]',
          host: 'preview.contentful.com',
          space: '5zbcxnn2cyg4',
        },
        delivery: {
          accessToken:
            'GS[r4r2NyiW4EovZ3cR8W0cUmUxUvr1qJ+i3Yot7yoEJGgme0DErHLWBL+vbUKRJdjS9QzqFbK6EybgjmBZNXOWB0EWZkKYGejjzW/OR0szDFc/bF0=]',
          environment_id: 'master',
          space: '5zbcxnn2cyg4',
        },
      },
    },
    sheets: {
      KK: {
        campaigns: '1A_4dUeH9qUW0Hckb4JXORcocHcLetoXaqPxZdBujVAM',
        landingPages: '1hipuFvxYbjGI9Uwc1LfIPjsyt6SpJxI0Bqnrhnjl6DM',
      },
      LD: {
        landingPages: '1wcqRBWM7BtcRwOiMjiLPalVfBu2cEMWjyv7S63Y5lAU',
        localizations: '1YaTe2uObDDdG9bU2SynS4ziQ4hIQaFS7fvO1lf6TXjs',
      },
      CJ: {
        landingPages: '1Mi59yoKWv19Be8UNiLudgt6fYYaxMNH34NJZGmPW38k',
      },
      OS: {
        landingPages: '124L2TFmIXCAF_X16lnzGQ-EmiizpE9dfLooKkThbak8',
      },
    },
    google: {
      api: {
        cache: process.env.NODE_ENV === 'test' || !!process.env.CI,
        type: 'service_account',
        project_id: 'idefix-184208',
        private_key_id: '64469b707949d5c4118a98d83cfd20e25f95370a',
        private_key:
          'GS[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' +
          'Mo8ezvyiJ/HTnEMXsEwjzVAwb3WHST4wh6Y/]',
        client_email: 'brandserver@idefix-184208.iam.gserviceaccount.com',
        client_id: '102430615635003475635',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:
          'https://www.googleapis.com/robot/v1/metadata/x509/brandserver%40idefix-184208.iam.gserviceaccount.com',
      },
    },
  },
};

module.exports = config;
