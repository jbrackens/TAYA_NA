/* @flow */
const qs = require('querystring');
const { v1: uuid } = require('uuid');
const redis = require('../redis');
const configuration = require('../configuration');
const paymentForm = require('./payment-form');
const logger = require('../logger');

const showForm = async (req: express$Request, res: express$Response, id: string): Promise<express$Response> => {
  const form = await redis.getTemporary('payment-form', id);
  if (form != null) {
    await redis.removeTemporary('payment-form', id);
    logger.debug('Returning payment form', form);
    return res.send(form);
  }
  return res.redirect('/api/deposit/fail');
};

const addForm = async (form: string, baseUrl: boolean = true): Promise<string> => {
  const id = uuid();
  await redis.setTemporary('payment-form', id, form);
  const path = `/api/deposit/form/${id}`;
  const url = baseUrl ? configuration.baseUrl(path) : path;
  logger.debug('addForm', { url, id, form });
  return url;
};

const createForm = async (action: string, parameters: any, method: 'GET' | 'POST' = 'POST'): Promise<string> => {
  if (method === 'GET') {
    const p = qs.stringify(parameters || {});
    return action + (p !== '' ? '?' : '') + p;
  }
  const form = paymentForm.create(action, parameters || {}, method);
  const url = await addForm(form);
  return url;
};

const addHtml = async (html: string): Promise<string> =>
  addForm(`<html style="margin: 0; padding: 0"><body style="margin: 0; padding: 0">${html}</body></html>`, false);

module.exports = { showForm, createForm, addForm, addHtml };
