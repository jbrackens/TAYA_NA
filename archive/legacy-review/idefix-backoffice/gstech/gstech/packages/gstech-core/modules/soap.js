/* @flow */
const { parseString, processors } = require('xml2js');
const { promisify } = require('util');
const { v1: uuid } = require('uuid');
const { axios } = require('./axios');
const logger = require('./logger');

const parseXml = promisify(parseString);

const xmlEncode = (input: ?string): string => (input == null ? '' : input.replace(/[<>&'"]/g, (c) => {
  switch (c) {
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '&': return '&amp;';
    case '\'': return '&apos;';
    case '"': return '&quot;';
    default: return '';
  }
}));

const parse = (xml: string): Promise<any> => parseXml(xml, {
  attrNameProcessors: [processors.stripPrefix],
  tagNameProcessors: [processors.stripPrefix],
});

const soapRequest = (endpoint: string): ((body: string) => Promise<any>) => async (body: string): Promise<any> => {
  const id = uuid();
  logger.debug('>>>>> SOAP', { id, endpoint, body });
  const { data: response } = await axios.post(endpoint, body);
  const content = await parse(response);
  logger.debug('<<<<< SOAP', { id, content });
  // TODO handle errors
  return content.Envelope.Body[0];
};

module.exports = { xmlEncode, soapRequest, parse };
