/* eslint-disable max-len */
/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { BrandServerConfiguration } from './src/server/common/types';

const configuration: Configuration<BrandServerConfiguration> = {
  publicKey:
    '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    signUpVerificationChannel: {
      default: 'email',
      countries: { FI: 'email', CA: 'email' },
    },
    resetPasswdVerificationChannel: {
      default: 'email',
      countries: { FI: 'email' },
    },
    google: {
      api: {
        type: 'service_account',
        project_id: 'localization-access',
        private_key_id: '8c3066fbdfc003e1cc72af630eccdfbf0a1162e8',
        private_key:
          'GS[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]',
        client_email: 'eegshare-eeg-tech@localization-access.iam.gserviceaccount.com',
        client_id: '101388058820546069966',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:
          'https://www.googleapis.com/robot/v1/metadata/x509/eegshare-eeg-tech%40localization-access.iam.gserviceaccount.com',
      },
      sso: {
        account: '28558080838-00c2m555rfi6cro54i9nk3b2tcjrd0pt.apps.googleusercontent.com',
        password: 'B0ASClFKeSCqdS11MR32ZH2c',
        domain: 'luckydino.com',
      },
      reCaptchas: {
        FK: {
          siteKey: '6LdITlclAAAAANdcG0B3IntvGO7peyha0_U8TbsP',
          secretKey:
            'GS[uwa6wW6m7FehYb0RC+6dAHWNzFvkiSexFjENqSEQ9UKhW1o7uCwMEoztVvT1ZRgCEAtYx430ZVQlcYWwGqg0N14bG3X+TNu0xCWaiODmeGE=]',
        },
        CJ: {
          siteKey: '6LewUFclAAAAAJCNSkYBEXdOadInFBggTz3IDO7K',
          secretKey:
            'GS[A6/BRaBbfUgtRLt79DSu2gPxmV19wPiTIYQBfNOIKHWQU4s7scI/UrM56aoJGZ58RrDycllzjAQQ92FoodoL4tb09irQVrexstyuzCVQtqE=]',
        },
        LD: {
          siteKey: '6LfbzlUlAAAAAF7jDi4_qW83H-8sE2lEcYe4xF3F',
          secretKey:
            'GS[sAaUOfpYoSruk5Rxtytx3h/ixHXxun6GyzWm2lOQ5zjWWNqVdcH6YOTpYfKCnjhrpK2XtupY0gX3x+BSuS5jgkUqwTrTHT4gA51qx0dIhPU=]',
        },
        KK: {
          siteKey: '6LeIU1clAAAAAAFDdXiF6gJ8MBT1evGWk7-Le06r',
          secretKey:
            'GS[BS6I0y/tP9TLzG6JNNe2EHGmXZyue6pJ8fJivaBsz4nFgEdHr+Vy1LuJ1sVLksowQDUeG5aQuC/nwQDFVeWLoxNoiBOjOKsDSpw4LhotfNg=]',
        },
        OS: {
          siteKey: '6LcfVVclAAAAALRtvgN0zTzKDg4O8bBkw8DQsTfF',
          secretKey:
            'GS[XhebCekDR5GN05Xgx4etVvpiMFWrA4BOk1QDDQfwiRbVk1zrXCW9T4bdZuxPNEOjL7C16u6Cx5Nyj+Y1jIw7jkHVX9E0e2M1RSDX3na3ncE=]',
        },
        SN: {
          siteKey: '6LfyVVclAAAAAIw3hAyv7XzJlhMaCz-ksqQMNSDl',
          secretKey:
            'GS[j6WBy9KxsD+RJV5nEmpUaxJg53a31ExWaYJo7ET3cmtuQ5KF7oKqMrMIL0vGyvbI422pV1bkZfPXxdvslVGoEOm3dmYhdhIV2bsIOwJqKm0=]',
        },
        VB: {
          siteKey: '6LeOV1clAAAAAEWDX819wE0SFmy6EZK9apYbFo-T',
          secretKey:
            'GS[INlP6PtryPanT4jqAwNhW6RCK+mvIZzIn5E+8Qx0FzAO2CRfAMBINFAFU3YP5jDbNyD+29TSq/ZMjS9sxaDGxpDXPF8cxwJBOBZNJR89pH8=]',
        },
      },
    },
    contentful: {
      OS: {
        environment_id: 'master',
        space: '3tiyadjidkkt',
        accessToken:
          'GS[dGrr1h4P2R2Txz+q/Xn2nzSDoPwczAffWqRf2AMBn+iy6zqWH935LgIWFwSdABExVmLQNoYTbvRQwLEnYZpK0p4hLBTjZEEEfTLtgWA2kyiOZRw=]',
      },
      KK: {
        environment_id: 'master',
        space: 'r4zhhatpe62n',
        accessToken:
          'GS[eK/cMYOAIcjq3EgwSXUTbmsiTkE/VYjNUoG1WFIQ3hqLRaxSYlqItx8JJQRGiYjdnR8Y9JEIP1ethHdal5YKlD04LiBLWMa02D0wMJGFNjb4kSM=]',
      },
      CJ: {
        environment_id: 'master',
        space: 'rch3pavcqb3m',
        accessToken:
          'GS[YNd5PIH4pyomis6sIRidHErOpPYmqSCqJKSfrGHHKXy6nHFDDHluII8r3w5M6vzE1UNbj/yStTR4MB5uTVev3Tw7N+JBg/0HbuM2JUsfvH5OlHw=]',
      },
      LD: {
        environment_id: 'master',
        space: 'swqbqf22teq9',
        accessToken:
          'GS[Jv7pYz5EenYkbG2sGuBttzhf2iiHaDPguG7kreSz5ORBOt8JcNgeGF44KNelH/rg1RTKuZqS89qRMqnI7OBi1uQkvqnGlzgwvikYIvncOTrNX/E=]',
      },
      FK: {
        environment_id: 'master',
        space: '72mfecpwrmgl',
        accessToken:
          'GS[1rGEAlfFiGcQlfcm/JtwgOjGdNgqu1mjw/PmAY61qToF8GIx/1Xcp0rVldA5vM7BiNU0WKcLzIK3E/7sNCggLdj0RI00POL3WlGLdcash4Tv0Ro=]',
      },
      SN: {
        environment_id: 'master',
        space: '21wv3h4ix3ge',
        accessToken:
          'GS[RH9A2LtHbIOsFL2Jd3u9+QACPtzA1iqga4/zk33R6AyRDfXUGk7c48NtEFpMVh/vEOshhu868jxorj/nCSiLWg3dTJkDKxeXg2ZVy7FTgvwf6QA=]',
      },
      VB: {
        environment_id: 'master',
        space: '5zbcxnn2cyg4',
        accessToken:
          'GS[r0aZ4nCBrG7ErXdMsX6rQtCZsmuROovSCHPdswqH9Dt1VtS3E0o+u0YWH6Awz3acbI+wEgTUFyAWL437z2kzT/YYMuerwwHBlZPH/5E1Wt0mH0E=]',
      },
    },
    adminUiToken: 't9ewrAj7No7XMEPU]8+2',
  },
};

module.exports = configuration;
