// @flow
import type { Affiliate } from '../../../types/repository/affiliates';
import type { UserWithRoles, AffiliateToken, UserToken } from '../../../types/repository/auth';

const jwt = require('jsonwebtoken');

const pg = require('gstech-core/modules/pg');
const userRepository = require('./user/repository');
const affiliatesRepository = require('../admin/affiliates/repository');
const childrenRepository = require('../admin/affiliates/children/repository');
const config = require('../../config');

const checkAffiliate = async (req: express$Request): Promise<?Affiliate> => {
  const token = req.headers['x-auth-token'];
  if (token) {
    const { affiliateId }: AffiliateToken = jwt.verify(token, config.affiliateAuthSecret);
    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);
    return affiliate;
  }

  return null;
};

const checkChildAffiliate = async (req: express$Request, parentId: Id): Promise<?Affiliate> => {
  const childId = req.headers['child-id'];
  if (childId) {
    const child = await childrenRepository.getChildAffiliate(pg, parentId, childId);
    return child;
  }

  return null;
};

const checkUser = async (req: express$Request): Promise<?UserWithRoles> => {
  const token = req.headers['x-auth-token'];
  if (token) {
    const { userId }: UserToken = jwt.verify(token, config.userAuthSecret);
    const user = await userRepository.getUser(pg, userId);
    return user;
  }

  return null;
};

const checkCloudflareUser = async (req: express$Request): Promise<?UserWithRoles> => {
  if (req.session && req.session.cloudflareUser && req.session.cloudflareUser.email) {
    const user = await userRepository.findUser(pg, req.session.cloudflareUser.email);
    if (!user) {
      const createdUser = await userRepository.createUser(pg, {
        email: req.session.cloudflareUser.email,
        password: '',
      }, 'user');

      return createdUser;
    }

    return { id: user.id, email: user.email, roles: user.roles };
  }

  return null;
};

const checkGoogleUser = async (req: express$Request): Promise<?UserWithRoles> => {
  if (req.session && req.session.googleUser && req.session.googleUser.email) {
    const user = await userRepository.findUser(pg, req.session.googleUser.email);
    if (!user) {
      const createdUser = await userRepository.createUser(pg, {
        email: req.session.googleUser.email,
        password: '',
      }, 'user');

      return createdUser;
    }

    return { id: user.id, email: user.email, roles: user.roles };
  }

  return null;
};

module.exports = {
  checkAffiliate,
  checkChildAffiliate,
  checkUser,
  checkCloudflareUser,
  checkGoogleUser,
};
