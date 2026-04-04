/* @flow */
const { v1: uuid } = require('uuid');
const redis = require('../../redis');
const configuration = require('../../configuration');
const logger = require('../../logger');

const showForm = async (req: express$Request, res: express$Response, id: string): Promise<express$Response> => {
  const form = await redis.getTemporary('game-form', id);
  if (form != null) {
    await redis.removeTemporary('game-form', id);
    logger.debug('Returning game form', form);
    return res.send(form);
  }
  return res.redirect('/api/deposit/fail');
};

const addForm = async (form: string, baseUrl: boolean = true): Promise<string> => {
  const id = uuid();
  await redis.setTemporary('game-form', id, form);
  const path = `/api/games/form/${id}`;
  const url = baseUrl ? configuration.baseUrl(path) : path;
  logger.debug('addForm', { url, id, form });
  return url;
};

const addHtml = async (html: string): Promise<string> =>
  addForm(`<html style="margin: 0; padding: 0"><body style="margin: 0; padding: 0">${html}</body></html>`, false);

module.exports = { showForm, addForm, addHtml };
