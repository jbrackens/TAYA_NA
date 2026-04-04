// @flow
import type { Reward, RewardType } from 'gstech-core/modules/types/rewards';
import type { Config } from 'gstech-core/modules/types/config';
import type { GetCountries } from '../../../types/api';

const logger = require('gstech-core/modules/logger');
const rewardserverClient = require('gstech-core/modules/clients/rewardserver-api');
const pg = require('gstech-core/modules/pg');
const { brands } = require('gstech-core/modules/constants');
const validate = require('gstech-core/modules/validate');

const { BANNER_LOCATIONS, REWARD_TRIGGERS } = require('../../constants');
const config = require('../../config');
const repository = require('./repository');
const { getUniqueHstoreKeys } = require('./repository');
const { getTagsSchema } = require('./schemas');

const getCountries = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getCountries', { query: req.query });
    const { brandId }: { brandId: BrandId } = (req.query: any);
    const campaigns = await repository.getCountries(pg, brandId);
    const response: DataResponse<GetCountries> = { data: campaigns };
    logger.debug('<<< getCountries', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getCountries', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getInitialData = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getInitialData');
    const response: DataResponse<{
      brands: { id: string, name: string }[],
      rewardTriggers: string[],
      bannerLocations: { [brandId: BrandId]: string[] },
    }> = {
      data: {
        brands: brands.map(({ id, name }) => ({ id, name })),
        rewardTriggers: REWARD_TRIGGERS,
        bannerLocations: BANNER_LOCATIONS,
      },
    };
    logger.debug('<<< getInitialData', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getInitialData', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getLanguages = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getLanguages', { query: req.query });
    const { brandId } = validate(req.query, getTagsSchema);
    const languages = config.languages[brandId.toUpperCase()];
    if (!languages) {
      logger.warn('!!! getLanguages', `langs for ${brandId} not found`);
      return res
        .status(400)
        .json({ error: { message: `Languages for brand ${brandId} not found!` } });
    }
    const response: DataResponse<Config['languages'][typeof brandId]> = { data: languages };
    logger.debug('<<< getLanguages', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getLanguages', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getRewards = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getRewards', { params: req.query });
    const { brandId } = validate(req.query, getTagsSchema);
    const { rewardType }: { rewardType: RewardType } = (req.query: any);
    const rewards = await rewardserverClient.getAvailableRewards(brandId, { rewardType, excludeDisabled: false });
    const response: DataResponse<Reward[]> = { data: rewards.map((el) => el.reward) };
    logger.debug('<<< getRewards', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getRewards', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getSegments = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getSegments', { query: req.query });
    const { brandId } = validate(req.query, getTagsSchema);
    const segments = await getUniqueHstoreKeys(pg, 'segments', brandId);
    const response: DataResponse<string[]> = { data: segments };
    logger.debug('<<< getSegments', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getSegments', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getTags = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getTags', { query: req.query });
    const { brandId } = validate(req.query, getTagsSchema);
    const tags = await getUniqueHstoreKeys(pg, 'tags', brandId);
    const response: DataResponse<string[]> = { data: tags };
    logger.debug('<<< getTags', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getTags', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getCountries,
  getInitialData,
  getLanguages,
  getRewards,
  getSegments,
  getTags,
};
