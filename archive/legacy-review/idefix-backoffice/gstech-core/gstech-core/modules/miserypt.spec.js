/* @flow */
const {
  keyGen,
  encrypt,
  decryptObject,
  decryptConfig,
} = require('./miserypt');

describe('Miserypt', () => {
  it('can encrypt and decrypt values', async () => {
    const keyPair = keyGen();
    const encrypted = {
      key: encrypt('value', keyPair.publicKey),
      list: [encrypt('listItem1', keyPair.publicKey), encrypt('listItem2', keyPair.publicKey)],
      obj: {
        key: encrypt('objValue1', keyPair.publicKey),
        key2: encrypt('objValue2', keyPair.publicKey),
        key3: null,
        key4: undefined,
      },
    };

    const decrypted = decryptObject(encrypted, keyPair.publicKey, keyPair.privateKey);
    expect(decrypted).to.deep.equal({
      key: 'value',
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
      publicKey: 'yyYsJRdS4Q/TwrcfKlaQ/lCkFB4lauiVuinCTjktVXI=',
      data: {
        staticTokens: {
          CJ: 'GS[vXF3V2iqqp/i1H2a3ZNuN5r4BncSM/e6ySX4XFbUXrtttqQLNTxFxHJxq6hgzMm4/Q==]',
          KK: 'GS[TI9ykOk/Ao+4odQIGdxy75x1Q0ToeJP7aNDYvTOlrJm1TOQe+BR0MHvkzJapLXLsQw==]',
          LD: 'GS[AYdNhL8M38ohl11ZrdS4m4vr895q2RivVQsHg9MxlUffWRrw9/HqOR2qnp1MzYOvhw==]',
          OS: 'GS[3zGkEsrlfz5emW6ZP0M0HEU3s7l3M4fhj8OdCPGe5mvVqNuxlqOoEN3HGMPGEOQp3A==]',
        },
      },
    };

    const decrypted = decryptConfig(encrypted);
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
