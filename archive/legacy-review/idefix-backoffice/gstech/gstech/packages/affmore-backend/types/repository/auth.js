/* @flow */
export type UserRole = 'user' | 'admin' | 'payer';

export type PinType = 'activate' | 'login' | 'reset';

export type UserQuery = {
  email?: string,
};

export type UserDraft = {
  email: string,
  password: string,
};

export type User = {
  id: Id,
  email: string,
};

export type UserWithRoles = {
  ...User,
  roles: UserRole[],
};

export type UserWithPasswordAndRoles = {
  ...User,
  password: string,
  roles: UserRole[],
};

export type AffiliateToken = {
  affiliateId: Id,
};

export type UserToken = {
  userId: Id,
};
