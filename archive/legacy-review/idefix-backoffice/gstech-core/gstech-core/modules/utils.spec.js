/* @flow */
const { guard } = require('./utils');

describe('Utils', () => {
  const obj: any = {
    a: {
      b: {
        c: 'value',
      },
    },
  };

  it('can get value', async () => {
    const result = guard(obj, o => o.a.b.c);
    expect(result).to.be.equal('value');
  });

  it('can get undefined if value not found', async () => {
    const result = guard(obj, o => o.a.b.d.e);
    expect(result).to.be.equal(undefined);
  });

  it('can get default if value not found', async () => {
    const result = guard(obj, o => o.a.b.d.e, 'default');
    expect(result).to.be.equal('default');
  });
});
