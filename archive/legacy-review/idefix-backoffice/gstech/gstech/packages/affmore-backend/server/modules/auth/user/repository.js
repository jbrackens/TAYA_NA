// @flow
import type {
  UserDraft,
  User,
  UserWithPasswordAndRoles,
  UserWithRoles,
  UserRole,
} from '../../../../types/repository/auth';

const getUsers = async (knex: Knex): Promise<User[]> => {
  const users = await knex('users')
    .select('users.id', 'users.email')
    .orderBy('users.id');

  return users;
};

const getUsersByRole = async (knex: Knex, roleName: string): Promise<User[]> => {
  const users = await knex('users')
    .select(['users.id', 'users.email'])
    .innerJoin('user_roles', 'users.id', 'user_roles.userId')
    .innerJoin('roles', 'roles.id', 'user_roles.roleId')
    .where({ 'roles.name': roleName })
    .orderBy('users.email');

  return users;
};

const getUserRoles = async (knex: Knex, userId: Id): Promise<UserRole[]> => {
  const roles = await knex('roles')
    .select(['roles.name', 'user_roles.userId'])
    .innerJoin('user_roles', 'roles.id', 'user_roles.roleId')
    .where({ 'user_roles.userId': userId })
    .orderBy('roles.name');

  return roles.map(x => x.name);
};

const assignUserRole = async (knex: Knex, userId: Id, roleName: string): Promise<UserRole[]> => {
  const role = await knex('roles').first(['roles.id']).where({ 'roles.name': roleName });
  if (!role) throw Error(`Role not found: ${roleName}`);

  const { id: roleId } = role;
  await knex('user_roles')
    .insert({ userId, roleId }, ['userId', 'roleId']);

  return getUserRoles(knex, userId);
};

const createUser = async (knex: Knex, userDraft: UserDraft, roleName: string): Promise<UserWithRoles> => {
  const [user] = await knex('users')
    .insert(userDraft, ['email', 'password'])
    .returning('*');

  user.roles = await assignUserRole(knex, user.id, roleName);

  return user;
};

const findUser = async (knex: Knex, email: string): Promise<?UserWithPasswordAndRoles> => {
  const user = await knex('users')
    .first(['id', 'email', 'password'])
    .where({ email });

  if (user) user.roles = await getUserRoles(knex, user.id);

  return user;
};

const getUser = async (knex: Knex, userId: Id): Promise<?UserWithRoles> => {
  const user = await knex('users')
    .first('id', 'email')
    .where({ id: userId })

  if (user) user.roles = await getUserRoles(knex, user.id);

  return user;
};

const updatePassword = async (knex: Knex, email: string, password: string): Promise<?UserWithPasswordAndRoles> => {
  const [user] = await knex('users')
    .update({ password }, ['password'])
    .where({ email })
    .returning('*');

  if (user) user.roles = await getUserRoles(knex, user.id);

  return user;
};

module.exports = {
  getUsers,
  getUsersByRole,
  getUserRoles,
  createUser,
  findUser,
  getUser,
  assignUserRole,
  updatePassword,
};
