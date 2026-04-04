/* eslint-disable max-len */
/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { BrandServerConfiguration } from './src/server/common/types';

const configuration: Configuration<BrandServerConfiguration> = {
  publicKey:
    '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
  data: {
    signUpVerificationChannel: {
      default: 'email',
      countries: { FI: 'sms', CA: 'email' },
    },
    resetPasswdVerificationChannel: {
      default: 'email',
      countries: {
        CA: 'email',
        // TODO: logic for fallback condition needs to be revised
        // when captcha is answered, rate limit counter is not increased
        // so the fallback condition on this count value does not trigger
        // FI: 'sms>email'
        FI: 'sms',
      },
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
          siteKey: '6LcWTVclAAAAAM4WZZQeYiucebL1ZbWs3aoar_UF',
          secretKey:
            'GS[4mr4YswZo7/vUEhuPNFNMRV4ntg//kEAKmzFEnK3u+8fJP8VocL8TiYveL0/6YMWY/1yoorlmp62Y/0k/GUtXgmoxj2HkZtHwuKN5iCQ4V0=]',
        },
        CJ: {
          siteKey: '6Le1TlclAAAAABXk01N2E59qE1QQy5w7Y5m-KkWc',
          secretKey:
            'GS[jKGfrBFzacGR+C1mW6GvIUliaVX9HGW4UpcAskSjOvwVhH5Mx2bLTJIASchOOmEd8Urb1u8hojErJmVQobVTVymMiG+jVeiIyfcfh/COjG8=]',
        },
        LD: {
          siteKey: '6Lc73VUlAAAAANEiKFP0FnP6Q0snYIVlLlaQtghX',
          secretKey:
            'GS[g8bbnr/MgvLdRk2/mqAzcvL9M8UcI0L+tE6VC/n58iO5b+/t6OQVGQ/tdJ6cYN/hsDy1f+WIPosKOUKJTQ3kzOwJmR9l8ixtif38ClEbGgc=]',
        },
        KK: {
          siteKey: '6LceU1clAAAAABoM_YhnXjOlPMANc-H8AXAFnN5L',
          secretKey:
            'GS[/aRK87oFBM0Vvtg1edfnFuoQoecU/4QHh4B8/j9+hYeOp5e2C91Sjge9Q6scWTYGc0Y/i6KXqZWYreYaD7Cbjs8yMWE1aFeJRae9p9jUvqM=]',
        },
        OS: {
          siteKey: '6LcfVVclAAAAALRtvgN0zTzKDg4O8bBkw8DQsTfF',
          secretKey:
            'GS[umGCm35n7QKcckBh79LG5z1odNdKOz/6EgXtT0KPQ+K50G9/g3ZH387KE0SzHxIvK0Yr7i2IlIgKN2JH7OakjS5eCnVxwURuUpn73Wgebgs=]',
        },
        SN: {
          siteKey: '6LeJVVclAAAAAC2j-iosA3qiJ0kf0E0pT1qhfTwG',
          secretKey:
            'GS[uDzAYgQwCxT9gVNYkJtvRGC+v8P/Ak96FhTzbTBz6g43n6bTFCoN+6ZsfXuQKiIu8dm8e/VwgvD9DFU4+MBtjbJq1hVjc6bwMXNtG2rTei4=]',
        },
        VB: {
          siteKey: '6LfDVlclAAAAABWgiFIo3AwEG00yjQz9XTWYIZNR',
          secretKey:
            'GS[mkEo9gQ+jQ3WIcHbzpJOnYHNyHIYI7zGLok9dh8Atk7dMpHoavrUI9zf5uuafIuOgGyVyDjN0dO7P9K/eZq0LqZkf/tJmJYXOHnifT+AvEk=]',
        },
      },
    },
    contentful: {
      OS: {
        environment_id: 'master',
        space: '3tiyadjidkkt',
        accessToken:
          'GS[VAdW5gkWTPHK66KLSV84w4Z4+8eyx4LGQn4MwsUwWWie26tGmHHd9adrQqNuSvGFayzGTphuCeFsgf4lEIyOMmpUWog//z3zIz/Q5MWjBiWZ3RM=]',
      },
      KK: {
        environment_id: 'master',
        space: 'r4zhhatpe62n',
        accessToken:
          'GS[VD2OqzEiXb+ktGWQNj7Fer/7LOpKznndhB5i1ZadOvauDgOJ029QK7pE5HQmeuGKN62a9iDykHggDdJuMcxo+8aZnN8flgMM+YdT7VaqOks0ySg=]',
      },
      CJ: {
        environment_id: 'master',
        space: 'rch3pavcqb3m',
        accessToken:
          'GS[bTNY1MoDUEyV/69kAXXdx0jz2zVEG5oovBH/J24bbkdEubDkSvB9mj2DRb8S/Z6mDD36a3T/IruMaR2J5uDsqbtc5jiirPRnw2PSRmNqwt91Zsw=]',
      },
      LD: {
        environment_id: 'master',
        space: 'swqbqf22teq9',
        accessToken:
          'GS[ch5jC3Rzko9L1YyS321Om5BMruOPJL4b/r5g6psyLgOIVL9ZVUOwou9gwxD77kt6VLGcaDvv2P6QT0KjUp8QWe5NcA8e2RtdiC1elknJ3X1TDUs=]',
      },
      FK: {
        environment_id: 'master',
        space: '72mfecpwrmgl',
        accessToken:
          'GS[Y3JPYNIe6hB8VVvmuxusGhpVRoEHTMT4xa+LHdgUouduu0OkUUj/27CH/aUP3Nd4O4UvpS8/qYMNpzT99EGJeRhH+eYC3dRs0uSwEM5uXqqD6es=]',
      },
      SN: {
        environment_id: 'master',
        space: '21wv3h4ix3ge',
        accessToken:
          'GS[BwZ+wBox2ky5gk9tNEnH47l44VnYPtKMHM4mVahA8FZb6NJAcna3KBHdN2P7kGqPNU5/E87v/QioTAao+BYKSUirTLE5tVZJnloFfsZWwSDuS8s=]',
      },
      VB: {
        environment_id: 'master',
        space: '5zbcxnn2cyg4',
        accessToken:
          'GS[r4r2NyiW4EovZ3cR8W0cUmUxUvr1qJ+i3Yot7yoEJGgme0DErHLWBL+vbUKRJdjS9QzqFbK6EybgjmBZNXOWB0EWZkKYGejjzW/OR0szDFc/bF0=]',
      },
    },
    adminUiToken: 't9ewrAj7No7XMEPU]8+2',
  },
};

module.exports = configuration;
