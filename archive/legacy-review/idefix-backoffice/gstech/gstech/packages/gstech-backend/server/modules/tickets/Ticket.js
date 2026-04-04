/* @flow */
const { DateTime } = require('luxon');
const pg = require('gstech-core/modules/pg');
const { upsert2 } = require('gstech-core/modules/knex');

export type Ticket = {
  id: Id,
  externalTicketId: string,
  content: Object,

  createdAt: Date,
  updatedAt: Date,
};

const getTicket = async (externalTicketId: string): Promise<Ticket> => {
  const ticket = await pg('tickets')
    .first('id', 'externalTicketId', 'content', 'createdAt', 'updatedAt')
    .where('externalTicketId', externalTicketId);

  return ticket;
};

const upsertTicket = async (externalTicketId: string, { content }: { content: Object }): Promise<Ticket> => {
  const result = await upsert2(pg, 'tickets', {
    externalTicketId,
    content,
    updatedAt: DateTime.local(),
  }, ['externalTicketId']);

  return result;
};

module.exports = {
  getTicket,
  upsertTicket,
 };
