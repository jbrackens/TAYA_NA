/* @flow */
const Boom = require('@hapi/boom');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const sms = require('gstech-core/modules/sms');
const { format } = require('gstech-core/modules/phoneNumber');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const { createSession, destroySession } = require('./sessionStore');
const { authenticate, changePassword, getById, getByEmail, get, updateAccessSettings, create, update, expirePassword, resetPassword } = require('./User');
const { getLog } = require('./UserEvent');
const { getToken } = require('./access');
const { settings } = require('../settings');
const { addEvent } = require('./UserEvent');
const { addCode, checkCode } = require('./UserVerificationCode');
const { loginSchema, accessSettingsSchema, userSchema, passwordSchema, resetPasswordSchema, confirmCodeSchema } = require('./schemas');

const generateVerificationCode = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;

const sendTextMessage = (verificationCode: number, mobilePhone: string) => sms.send(mobilePhone, `Your password reset code is ${verificationCode}`);

const loginUserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { email, password } = await validate(req.body, loginSchema, 'Login failed');
    const user = await authenticate(email, password, req.clientIp);
    const token = await createSession(user.id, req.ip);

    return res.json({
      userId: user.id,
      token,
      settings: settings(),
    });
  } catch (err) {
    logger.warn('User login failed', err);

    if (!err.data) {
      return next(Boom.forbidden(err.message, { code: err.code }));
    }
    return next(err);
  }
};

const logoutUserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const token = getToken(req);
    if (token) {
      await destroySession(token);
    }
    await addEvent(pg, req.userSession.id, 'Logged out', {}, req.clientIp);
    return res.status(403).send('Authentication required');
  } catch (err) {
    logger.warn('User logout failed', err);
    return next(err);
  }
};

const getUsersHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const users = await get();
    return res.status(200).json(users);
  } catch (err) {
    logger.warn('Get users failed', err);
    return next(err);
  }
};

const getUserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = Number(req.params.userId);
    const user = await getById(userId);
    return res.status(200).json({ ...user, mobilePhone: format(user.mobilePhone) });
  } catch (err) {
    logger.warn('Get user failed', err);
    return next(err);
  }
};

const getCurrentUserAccessSettingsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = req.userSession.id;
    const user = await getById(userId);
    return res.status(200).json({
      reportingAccess: user.reportingAccess || user.administratorAccess,
      administratorAccess: user.administratorAccess,
      paymentAccess: user.paymentAccess || user.administratorAccess,
      campaignAccess: user.campaignAccess || user.administratorAccess,
      riskManager: user.riskManager || user.administratorAccess,
    });
  } catch (err) {
    logger.warn('Get current user access settings failed', err);
    return next(err);
  }
};

const getUserAccessSettingsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = Number(req.params.userId);
    const user = await getById(userId);
    return res.status(200).json({
      accountClosed: user.accountClosed,
      loginBlocked: user.loginBlocked,
      requirePasswordChange: user.requirePasswordChange,
      reportingAccess: user.reportingAccess,
      administratorAccess: user.administratorAccess,
      paymentAccess: user.paymentAccess,
      campaignAccess: user.campaignAccess,
      riskManager: user.riskManager,
    });
  } catch (err) {
    logger.warn('Get user access settings failed');
    return next(err);
  }
};

const updateUserAccessSettingsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = Number(req.params.userId);
    const accessSettingsDraft = await validate(req.body, accessSettingsSchema, 'Update failed');

    const accessSettings = await updateAccessSettings(userId, accessSettingsDraft, req.clientIp, req.userSession.id);

    return res.status(200).json(accessSettings);
  } catch (err) {
    logger.warn('Update user access settings failed');
    return next(err);
  }
};

const getUserLogHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = Number(req.params.userId);
    const log = await getLog(pg, userId);
    return res.status(200).json(log);
  } catch (err) {
    logger.warn('Get user log failed');
    return next(err);
  }
};

const createUserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userDraft = await validate(req.body, userSchema, 'User creation failed');
    const user = await create({ ...userDraft,
      requirePasswordChange: true,
      hash: '',
    });

    return res.status(200).json(user);
  } catch (err) {
    logger.warn('User creation failed');
    return next(err);
  }
};

const updateUserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const userId = Number(req.params.userId);
    const userDraft = await validate(req.body, userSchema, 'Update failed');
    const user = await update(userId, userDraft);
    return res.status(200).json({ ...user, mobilePhone: format(user.mobilePhone) });
  } catch (err) {
    logger.warn('User update failed');
    return next(err);
  }
};

const changePasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { oldPassword, newPassword, confirmPassword } = await validate(req.body, passwordSchema, 'Change password validation failed');

    if (newPassword !== confirmPassword) {
      const message = 'New password and confirmation password do not match';
      logger.warn(message);

      return next(Boom.badRequest(message));
    }

    await changePassword(req.params.email, oldPassword, newPassword);
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.warn('Change password failed', err);

    if (!err.isJoi && err.code) {
      const { message, code } = err;
      return next(Boom.badRequest(message, { code }));
    }

    if (err.isJoi && err.errors.newPassword) {
      const { message, code } = errorCodes.INVALID_NEW_PASSWORD;
      return next(Boom.badRequest(message, { code, errors: err.errors }));
    }

    return next(err);
  }
};

const expirePasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    await expirePassword(req.userSession.id);
    return res.status(403).send('Authentication required');
  } catch (err) {
    logger.warn('Expire password failed');
    return next(err);
  }
};

const sendVerificationCodeHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { email } = req.params;
    const { id, mobilePhone } = await getByEmail(email);
    const verificationCode = generateVerificationCode(100000, 999999);

    try {
      await sendTextMessage(verificationCode, mobilePhone);
    } catch (err) {
      const { error } = err;
      return next(Boom.badRequest(error.errorMessage));
    }
    await addCode(id, verificationCode, req.clientIp);

    return res.status(200).json(true);
  } catch (err) {
    logger.warn('Send reset SMS failed');

    if (!err.data) {
      return next(Boom.badRequest(err.message));
    }

    return next(err);
  }
};

const checkVerificationCodeHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { code, email } = await validate(req.body, confirmCodeSchema, 'Reset password validation failed');
    const { id } = await getByEmail(email);

    await checkCode(code, id);

    return res.status(200).json(true);
  } catch (err) {
    logger.warn('Confirm verification code failed');

    if (!err.data) {
      return next(Boom.badRequest(err.message));
    }

    return next(err);
  }
};

const resetPasswordHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { newPassword, confirmPassword, email, code } = await validate(req.body, resetPasswordSchema, 'Reset password validation failed');

    if (newPassword !== confirmPassword) {
      const message = 'New password and confirmation password do not match';
      logger.warn(message);

      return next(Boom.badRequest(message));
    }

    const response = await resetPassword(email, code, newPassword);

    return res.status(200).json(response);
  } catch (err) {
    logger.warn('Reset password failed');

    if (!err.data) {
      return next(Boom.badRequest(err.message));
    }

    return next(err);
  }
};

module.exports = {
  loginUserHandler,
  logoutUserHandler,
  getUsersHandler,
  getUserHandler,
  getCurrentUserAccessSettingsHandler,
  getUserAccessSettingsHandler,
  updateUserAccessSettingsHandler,
  getUserLogHandler,
  createUserHandler,
  updateUserHandler,
  changePasswordHandler,
  expirePasswordHandler,
  sendVerificationCodeHandler,
  checkVerificationCodeHandler,
  resetPasswordHandler,
};
