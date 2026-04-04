/* @flow */
const {
  keyGen,
  encrypt,
  decryptConfig,
} = require('./miserypt');

describe('Miserypt', () => {
  it('can encrypt and decrypt values', async () => {
    const keyPair = keyGen();
    const encrypted: any = {
      key: keyPair.publicKey,
      data: {
        list: [encrypt('listItem1', keyPair.publicKey), encrypt('listItem2', keyPair.publicKey)],
        obj: {
          key: encrypt('objValue1', keyPair.publicKey),
          key2: encrypt('objValue2', keyPair.publicKey),
          key3: null,
          key4: undefined,
        },
      }
    };

    const decrypted = decryptConfig(encrypted, keyPair.privateKey);
    expect(decrypted).to.deep.equal({
      list: ['listItem1', 'listItem2'],
      obj: {
        key: 'objValue1',
        key2: 'objValue2',
        key3: null,
        key4: undefined,
      },
    });
  });

  it('can decrypt configuration values', async () => {
    const encrypted = {
      publicKey: '43Db5DduLtSY19ZJAVfFwbh3BxhFSGEjE7L+fLBxnAc=|piGkPlMIyT0beXYdf1HZ4awiWnDOpHIOlLPAOYdD18A=',
      data: {
        staticTokens: {
          CJ: 'GS[O+Z4SGHTFQ8rjmnjObHe+q563xbdDff9U4Me6v69d29Wd0yObxvnpM561ipgB9ZLSA==]',
          KK: 'GS[lfXDC/6TRrPzPEIEVuzQObRYkOVElMtmvbfY5zp3vt5hNixmSZbIe7svovLFuy52WA==]',
          LD: 'GS[PSKihfZWExkiuX7etrHD6Zek9j4YYWeJEAf/u6C1IQ4NNfk6rsnBD05+hsVlB9Si2Q==]',
          OS: 'GS[UdlPd+qYRmlofhmhf8QvXvfjrxHxdjNxeElaIc0ipj8M83hRDR2d6zT3O1jjXdOEdg==]',
        },
      },
    };

    const decrypted = decryptConfig(encrypted, '4AvmRSdBmVicpVqbSrA4XR/J8gpukLxwTZTzVOArOFs=|f031N53S8SauLGMUL/mEGX8WuPvak14KFoICCm8HWPA=');
    expect(decrypted).to.deep.equal({
      staticTokens: {
        CJ: 'tokens_CJ',
        KK: 'tokens_KK',
        LD: 'tokens_LD',
        OS: 'tokens_OS',
      },
    });
  });
});
