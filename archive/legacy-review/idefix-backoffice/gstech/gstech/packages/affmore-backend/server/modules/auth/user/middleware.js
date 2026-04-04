// @flow
import type { UserSession } from "../../../../types/common";
import type {
  UserWithRoles,
  UserWithPasswordAndRoles,
  UserToken,
  UserRole,
} from '../../../../types/repository/auth';

const jwt = require('jsonwebtoken');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { checkUser, checkGoogleUser } = require('../common');

const generateAuthToken = (user: UserWithPasswordAndRoles): string => {
  const payload: UserToken = {
    userId: user.id,
  };
  const token = jwt.sign(payload, config.userAuthSecret);
  return token;
};

const checkUserRoles = (user: UserWithRoles, roles: $ReadOnlyArray<UserRole>): boolean =>
  roles.some((role) => user.roles.includes(role));

const auth = (
  roleCriteria: UserRole[] | UserRole = [],
): ((
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => Promise<mixed> | Promise<express$Response>) => async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const allowedRoles: $ReadOnlyArray<UserRole> = _.castArray(roleCriteria);
    const user = await checkGoogleUser(req) || await checkUser(req);
    if (!user) {
      logger.warn('User auth error. User in neither cloudflare user nor normal user.', { headers: req.headers });
      return res.status(401).json({ error: { message: 'Access denied.' } });
    }

    const allowed = checkUserRoles(user, allowedRoles);
    if (!allowed) {
      logger.warn('User auth error. User has no permissions.', { userId: user.id, userRoles: user.roles, allowedRoles });
      return res.status(403).json({ error: { message: 'No permissions.' } });
    }

    const session: UserSession = {
      user,
    };
    req.session = session;

    return next();
  } catch (e) {
    logger.error('User auth error', e);
    return res.status(401).json({ error: { message: 'Access denied.' } });
  }
};

module.exports = {
  generateAuthToken,
  auth,
};
