// @flow
import type { LoginRequest, LoginResponse } from '../../../../types/api/auth';
import type { GetUserResponse } from '../../../../types/api/users';

const bcrypt = require('bcrypt');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const schemas = require('./schemas');
const repository = require('./repository');
const { generateAuthToken } = require('./middleware');

const loginHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('loginHandler request', { params: req.params });

    const request = validate<LoginRequest>(req.body, schemas.loginSchema);

    const user = await repository.findUser(pg, request.email);
    if (!user) return res.status(403).json({ error: { message: 'User email and/or password is incorrect' } });

    const isValidHash = await bcrypt.compare(request.password, user.password);
    if (!isValidHash) return res.status(403).json({ error: { message: 'User email and/or password is incorrect' } });

    const token = generateAuthToken(user);

    const response: DataResponse<LoginResponse> = {
      data: {
        email: user.email,
        roles: user.roles,
      },
    };
    return res.header('x-auth-token', token).json(response);
  } catch (e) {
    logger.error('loginHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.httpCode === 500 ? 'Server Error' : e.message } });
  }
};

const userProfileHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('userProfileHandler request', { params: req.params });

    const user = await repository.getUser(pg, req.session.user.id);
    if (!user) return res.status(403).json({ error: { message: 'User email and/or password is incorrect' } });

    const response: DataResponse<GetUserResponse> = {
      data: {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('userProfileHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  loginHandler,
  userProfileHandler,
};
