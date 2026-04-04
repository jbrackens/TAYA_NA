/* @flow */

const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');

const logger = require('gstech-core/modules/logger');

type IpWithDetails = { ipAddress: string, list: 'vpn' | 'tor' };
const ipAddresses: IpWithDetails[] = [];

const prepareVPN = async (url: string): Promise<void> => {
  const { data: resp } = await axios.get(url);
  return resp.split('\n').forEach((ipAddress) => ipAddresses.push({ ipAddress, list: 'vpn' }));
};

const prepareTor = async (): Promise<void> => {
  const url = 'https://check.torproject.org/torbulkexitlist';
  const { data: resp } = await axios.get(url);
  return resp.split('\n').forEach((ipAddress) => ipAddresses.push({ ipAddress, list: 'tor' }));
};

const prepareIpAddresses = async () => {
  try {
    await Promise.all([
      prepareTor(),
      prepareVPN('https://github.com/X4BNet/lists_vpn/raw/main/output/datacenter/ipv4.txt'),
    ]);
    logger.info('+++ prepareIpAddresses', { ..._.countBy(ipAddresses, 'list') });
  } catch (e) {
    logger.error('XXX prepareIpAddresses', e);
  }
};

module.exports = {
  prepareIpAddresses,
  ipAddresses,
};
