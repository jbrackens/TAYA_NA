/* @flow */
const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.pragmatic;

const getRoundsToClose = async (
  secureLogin: string,
  secretKey: string,
  timepoint: string,
): Promise<{
  data: { playSessionID: string, extPlayerID: string, timestamp: string }[],
  timestamp: Date | string,
}> => {
  logger.debug('>>>>> Pragmatic GETROUNDSTOCLOSE', { timepoint });
  const op = {
    method: 'GET',
    url: `https://${configuration.apiServer}/IntegrationService/v3/DataFeeds/gamerounds/finished/`,
    params: {
      login: secureLogin,
      password: secretKey,
      timepoint,
    },
  };
  const { data: resp } = await axios.request(op);
  if (resp === '') {
    return { data: [], timestamp: new Date(timepoint) };
  }
  const [timestamp, header, ...rows] = resp.split('\n');
  if (header == null) {
    throw new Error(`Invalid response from PragmaticAPI ${resp}`);
  }
  const keys = header.split(',');
  const data = rows
    .filter((r) => r != null)
    .map((row) => {
      const values = row.split(',');
      if (values.length === keys.length) {
        const r = {};
        keys.forEach((key, index) => {
          r[key] = values[index];
        });
        return r;
      }
      return null;
    })
    .filter((x) => x != null);
  const ts = timestamp.split('=');
  const tsresult = ts.length === 2 ? ts[1] : timepoint;
  logger.debug('<<<<< Pragmatic GETROUNDSTOCLOSE', { timestamp, tsresult });
  return { data, timestamp: tsresult };
};


module.exports = { getRoundsToClose };
