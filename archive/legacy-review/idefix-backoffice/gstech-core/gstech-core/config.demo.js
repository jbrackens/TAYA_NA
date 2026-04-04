/* @flow */
import type { Configuration, CoreConfiguration } from './modules/types/config';

const configuration: Configuration<CoreConfiguration> = {
  publicKey: 'yyYsJRdS4Q/TwrcfKlaQ/lCkFB4lauiVuinCTjktVXI=',
  data: {
    staticTokens: {
      CJ: 'GS[vXF3V2iqqp/i1H2a3ZNuN5r4BncSM/e6ySX4XFbUXrtttqQLNTxFxHJxq6hgzMm4/Q==]',
      KK: 'GS[TI9ykOk/Ao+4odQIGdxy75x1Q0ToeJP7aNDYvTOlrJm1TOQe+BR0MHvkzJapLXLsQw==]',
      LD: 'GS[AYdNhL8M38ohl11ZrdS4m4vr895q2RivVQsHg9MxlUffWRrw9/HqOR2qnp1MzYOvhw==]',
      OS: 'GS[3zGkEsrlfz5emW6ZP0M0HEU3s7l3M4fhj8OdCPGe5mvVqNuxlqOoEN3HGMPGEOQp3A==]',
    },
    slack: {
      hook: 'https://hooks.slack.com/services/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',
    },
    smsapicom: {
      general: {
        sender: '',
        login: '',
        token: '',
      },
      branded: {
        CJ: {
          sender: '',
          login: '',
          token: '',
        },
        KK: {
          sender: '',
          login: '',
          token: '',
        },
        LD: {
          sender: '',
          login: '',
          token: '',
        },
        OS: {
          sender: '',
          login: '',
          token: '',
        },
      },
    },
    moreify: {
      general: {
        login: '',
        password: '',
      },
      branded: {
        CJ: {
          login: '',
          password: '',
        },
        KK: {
          login: '',
          password: '',
        },
        LD: {
          login: '',
          password: '',
        },
        OS: {
          login: '',
          password: '',
        },
      },
    },
  },
};

module.exports = configuration;
