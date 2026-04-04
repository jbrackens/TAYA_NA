/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { RewardserverConfiguration } from './types/config';

const config: Configuration<RewardserverConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    sheets: {
      LD: {
        games: '0AhYvpqGIu7rZdHo0THYyUWYwa0RjSHpsUE93SUZPdWc',
        rewards: '1l6jTdRB5AbI8PEYbW3uNHLMEa5WMqCm8lY_QPQk-6AM',
      },
      OS: {
        games: '1fPJa0dQXmBPDBE3Oive5uRmryVIcGE3HWX6gZZokjic',
        rewards: '1C9m1WZpaFxnWVQvbDiMIMOnrayPTd1Xg0__hdq1-uKs',
      },
      KK: {
        games: '1rKPtDIspQV_pjaG-7XuBen4oD_ubfEgpGUuExSo7Q1I',
        rewards: '1fzzG0NQUriXf3MAabHxLqafVxOLReC7Vf2_swEVnaIw',
      },
      CJ: {
        games: '0AhYvpqGIu7rZdDFPVWRabnRjNlJwUlRwTGVlcUVNZ1E',
        rewards: '1S56xOw8g1FZyYIOuWt-U76PRrr5ulDQgeMnlWGSQFi0',
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
