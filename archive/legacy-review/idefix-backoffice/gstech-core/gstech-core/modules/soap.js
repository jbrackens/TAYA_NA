/* @flow */
const { parseString, processors } = require('xml2js');
const request = require('request-promise');
const { promisify } = require('es6-promisify');
const uuid = require('uuid/v1');
const logger = require('./logger');

const parseXml = promisify(parseString);

const xmlEncode = (input: ?string) => (input == null ? '' : input.replace(/[<>&'"]/g, (c) => {
  switch (c) {
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '&': return '&amp;';
    case '\'': return '&apos;';
    case '"': return '&quot;';
    default: return '';
  }
}));

const parse = (xml: string) => parseXml(xml, {
  attrNameProcessors: [processors.stripPrefix],
  tagNameProcessors: [processors.stripPrefix],
});

const soapRequest = (endpoint: string) => async (body: string) => {
  const id = uuid();
  logger.debug('soapRequest', id, endpoint, body);
  const response = await request({
    uri: endpoint,
    method: 'POST',
    body,
  });
  const content = await parse(response);
  logger.debug('soapResponse', id, content);
  // TODO handle errors
  return content.Envelope.Body[0];
};

module.exports = { xmlEncode, soapRequest, parse };
