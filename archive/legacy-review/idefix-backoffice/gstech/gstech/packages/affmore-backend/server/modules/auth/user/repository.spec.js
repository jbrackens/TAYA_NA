/* @flow */
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('User Auth Repository', () => {
  const initUser = () => {
    const timeStamp = new Date().getTime();
    const testUser = {
      source: {
        email: `johnson${timeStamp}@bravo.com`,
        password: '123456789',
      },
      result: {
        email: `johnson${timeStamp}@bravo.com`,
        password: '123456789',
        roles: ['payer'],
      },
    };

    return testUser;
  };

  it('can get users', async () => {
    const [user] = await repository.getUsers(pg);
    expect(user).to.deep.equal({
      id: 0,
      email: 'admin@luckydino.com',
    });
  });

  it('can get users by role', async () => {
    const { source } = initUser();
    await repository.createUser(pg, source, 'admin');

    const users = await repository.getUsersByRole(pg, 'admin');
    expect(users.length).to.at.least(1);
  });

  it('can create user', async () => {
    const { source, result } = initUser();
    const user = await repository.createUser(pg, source, 'payer');
    expect(user).to.containSubset(result);
  });

  it('can find user by email', async () => {
    const { source, result } = initUser();
    await repository.createUser(pg, source, 'payer');
    const user = await repository.findUser(pg, source.email);

    expect(user).to.containSubset(result);
  });

  it('can get undefined if no user found', async () => {
    const user = await repository.findUser(pg, 'jackie@bravo.com');
    expect(user).to.equal(undefined);
  });

  it('can get user', async () => {
    const user = await repository.getUser(pg, 0);
    expect(user).to.deep.equal({
      id: 0,
      email: 'admin@luckydino.com',
      roles: ['admin'],
    });
  });

  it('can assign user role', async () => {
    const { source } = initUser();
    const user = await repository.createUser(pg, source, 'payer');
    const roles = await repository.assignUserRole(pg, user.id, 'admin');
    expect(roles).to.deep.equal(['admin', 'payer']);
  });

  it('can get user roles', async () => {
    const { source } = initUser();
    const user = await repository.createUser(pg, source, 'payer');
    const roles = await repository.getUserRoles(pg, user.id);

    expect(roles).to.deep.equal(['payer']);
  });

  it('can update user password', async () => {
    const { source } = initUser();
    const user = await repository.createUser(pg, source, 'payer');
    const updatedUser = await repository.updatePassword(pg, user.email, '987654321');
    expect(updatedUser && updatedUser.password).to.containSubset('987654321');
  });

  it('can get undefined updating non existing user password', async () => {
    const updatedUser = await repository.updatePassword(pg, 'jackie@bravo.com', '987654321');
    expect(updatedUser).to.equal(undefined);
  });
});
