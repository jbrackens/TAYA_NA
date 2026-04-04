/* @flow */
import type { GetThumbnailsParams, GetThumbnailsResponse } from '../../../types/api/thumbnails';

const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const { getThumbnailsSchema } = require('./schemas');
const Thumbnails = require('./Thumbnails');

const getThumbnails = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getThumbnails request', { params: req.params, body: req.body });

    const { brandId } = validate<GetThumbnailsParams>(req.query, getThumbnailsSchema);

    const thumbnails = await Thumbnails.getThumbnails(pg, brandId);
    const response: DataResponse<GetThumbnailsResponse> = {
      data: thumbnails.map((thumb) => _.omit(thumb, 'brandId')),
    };
    return res.json(response);
  } catch (e) {
    logger.error('getAvailableRewards error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getThumbnails,
};
