/* @flow */
const pg = require('gstech-core/modules/pg');
const User = require('./User');
const UserEvent = require('./UserEvent');

describe('Users', () => {
  it('can authenticate user with password', async () => {
    const user = await User.authenticate('test@luckydino.com', 'foobar123', '1.2.3.4');
    expect(user.id).to.equal(1);
  });

  it('returns an error with invalid password', async () => {
    try {
      await User.authenticate('test@luckydino.com', 'xxx', '1.2.3.4');
      expect(true).to.equal(false);
      // eslint-disable-next-line
    } catch (e) {}
  });

  it('returns log of user events', async () => {
    await UserEvent.getLog(pg, 1);
  });

  // TODO tests missing for password change etc
});
