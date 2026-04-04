// @flow
import type { GetUsersResponse } from '../../../../types/api/users';

const { Router } = require('express');

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const repository = require('../../auth/user/repository');

const router: express$Router<> = Router(); // eslint-disable-line

const getUsersHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getUsersHandler request', { session: req.session, params: req.params, body: req.body });

    const users = await repository.getUsers(pg);
    const usersWithRoles = await Promise.all(users.map(async ({ id: userId, email }) => {
      const roles = await repository.getUserRoles(pg, userId);
      return { userId, email, roles };
    }));

    const response: DataResponse<GetUsersResponse> = {
      data: {
        users: usersWithRoles.map(({ userId, email, roles }) => ({
          userId, email, roles,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getUsersHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getUsersHandler,
};
