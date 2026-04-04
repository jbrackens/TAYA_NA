/* @flow */
import type { UserRole } from '../repository/auth';

export type GetUserResponse = {
  userId: Id,
  email: string,
  roles: UserRole[],
};

export type GetUsersResponse = {
  users: GetUserResponse[],
};
