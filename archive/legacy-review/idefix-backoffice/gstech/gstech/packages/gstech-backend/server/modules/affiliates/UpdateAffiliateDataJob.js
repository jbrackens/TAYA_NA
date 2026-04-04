/* @flow */
const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const Affiliate = require('./Affiliate');
const config = require('../../../config');

const update = async () => {
  try {
    logger.debug('UpdateAffiliateDataJob start');
    const op = { url: `${config.affiliateSystem.url}/api/v1/affiliates`, headers: { Authorization: `Token ${config.affiliateSystem.token}` }};
    const { data: { affiliates }} = (await axios.request(op)).data;
    await Affiliate.update(affiliates.map(aff => ({ id: aff.affiliateId, name: aff.affiliateName })));
    await Affiliate.updateAffiliateTagging();
    logger.debug('UpdateAffiliateDataJob end', affiliates);
  } catch (e) {
    logger.error('UpdateAffiliateDataJob error', e);
  }
};

module.exports = { update };
