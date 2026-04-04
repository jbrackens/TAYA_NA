[![Build Status](https://ci.luckydino.net/job/gstech-core/badge/icon)](https://ci.luckydino.net/job/gstech-core/)

# gstech-core

## Useful Tools

Here's the list of useful tools worth using sometimes:

- [json-to-flowtype-generator](https://github.com/zth/json-to-flowtype-generator)
- [json-to-js](https://github.com/Dinoshauer/json-to-js)
- [npm-check](https://github.com/dylang/npm-check)

## Configuration

By convention application configuration files located in the project root. Typically, two separated configuration sets are used for testing and production purposes.

`config.demo.js` - should be used by the application if `NODE_ENV` is either `development` or `test`.

`config.real.js` - should be used by the application if `NODE_ENV` is set to `production`.

Both files must be supplied with `publicKey`, value however can be optionally/partially encrypted. Unencrypted values will be used as they are.
The `core` will always try to decrypt configuration file and fail with error if any of these conditions is true:

- Public key is not defined for the configuration file
- Private key wasn't passed to the application as environmental variable
- Supplied keys fail to decrypt encrypted values

### Configuration file structure

By convention application configuration file should have the following structure:

```sh
/* @flow */
import type { Configuration, Custom } from './modules/types/config';

const configuration: Configuration<Custom> = {
  publicKey: 'yyYsJRdS4Q/TwrcfKlaQ/lCkFB4lauiVuinCTjktVXI=',
  data: {
    customSection: {
      CJ: 'GS[vXF3V2iqqp/i1H2a3ZNuN5r4BncSM/e6ySX4XFbUXrtttqQLNTxFxHJxq6hgzMm4/Q==]',
      KK: 'some_secret',
      LD: 'GS[AYdNhL8M38ohl11ZrdS4m4vr895q2RivVQsHg9MxlUffWRrw9/HqOR2qnp1MzYOvhw==]',
      OS: 'some_secret',
    },
  },
};

module.exports = config;
```

Everything except the `publicKey` is custom content and supposed to be defined as a Flow Type:

```sh
export type Custom = {
  customSection: {
    CJ: string,
    KK: string,
    LD: string,
    OS: string,
  },
};
```

### Loading Configuration file

In order to use configuration file do something as following, typically in application `config.js` file:

```sh
import type { Configuration } from './core/modules/types/config';
import type { Custom } from './server/types';

const coreConfig = require('./core/modules/config');
const miserypt = require('./core/modules/miserypt');

const configuration: Configuration<Custom> = require(`./config.${coreConfig.configurationSet}.js`);
const customConfiguration = miserypt.decryptConfig(configuration);

const config: CustomConfiguration = {
  ...coreConfig,
  ...customConfiguration,
};

module.exports = config;
```

### Generating Key Pair

Use following command to generate new public and private key pair:

```sh
yarn config:keygen
```

Public key must be copied to configuration file e.g. `config.real.js`.
Private key must be passed to the application as an environmental variable named `CONFIG_KEY`. Alternatively, private key can passed as docker swarm secret named `CONFIG_KEY`.

Use following command to encrypt a value with file:

```sh
yarn config:encrypt real some_secret
```

Output value must copied and replace `some_secret` value in the respective configuration file.
