/* @flow */

const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');
const Ticket = require('./Ticket');

const getTicketSchema = joi.object({
  externalTicketId: joi.string().required(),
});

const getTicketHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { externalTicketId } = await validate(req.params, getTicketSchema, 'Get ticket');

    const ticket = await Ticket.getTicket(externalTicketId);
    return res.status(200).json({ ticket });
  } catch (e) {
    logger.error('getTicketHandler', e);
    return next(e);
  }
};

module.exports = {
  getTicketHandler,
};
