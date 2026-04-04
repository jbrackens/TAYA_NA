/* @flow */

const Boom = require('@hapi/boom');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');
const Ticket = require('./Ticket');

const createOrUpdateTicketSchema = joi.object({
  externalTicketId: joi.string().required(),
  content: joi.object().required(),
});

const createOrUpdateTicketHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { externalTicketId, content } = await validate(req.body, createOrUpdateTicketSchema, 'Create or Update ticket');

    const ticket = await Ticket.upsertTicket(externalTicketId, { content });
    return res.status(200).json({ ticket });
  } catch (e) {
    logger.error('createOrUpdateTicketHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

module.exports = {
  createOrUpdateTicketHandler,
};
