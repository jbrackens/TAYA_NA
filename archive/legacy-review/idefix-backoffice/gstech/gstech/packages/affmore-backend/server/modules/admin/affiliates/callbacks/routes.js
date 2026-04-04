// @flow
import type { CreateCallbackRequest, GetCallbackRequest, UpdateCallbackRequest, DeleteCallbackRequest, CreateCallbackResponse, GetCallbacksResponse, UpdateCallbackResponse } from '../../../../../types/api/callbacks';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const affiliatesRepository = require('../repository');
const linksRepository = require('../links/repository');
const schemas = require('./schemas');

const createCallbackHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createCallbackHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params, body } = req;
    const { session: { user }, params: { affiliateId }, callback: callbackDraft } = validate<CreateCallbackRequest>({ session, params, ...body }, schemas.createCallbackSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    // TODO: wrap into transaction
    const similarCallback = await repository.findCallback(pg, { affiliateId, ...callbackDraft });
    if (similarCallback) {
      return res.status(409).json({
        error: { message: 'Callback with this data already exists' },
      });
    }

    const callback = await repository.createCallback(pg, affiliateId, callbackDraft, user.id);

    const response: DataResponse<CreateCallbackResponse> = {
      data: {
        callback: {
          callbackId: callback.id,
          linkId: callback.linkId,
          brandId: callback.brandId,
          method: callback.method,
          trigger: callback.trigger,
          url: callback.url,
          enabled: callback.enabled,
          createdBy: callback.createdBy,
          createdAt: callback.createdAt,
          updatedAt: callback.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createCallbackHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getCallbacksHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getCallbacksHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, params } = req;
    const { params: { affiliateId } } = validate<GetCallbackRequest>({ session, params }, schemas.getCallbackSchema);

    const callbacks = await repository.getCallbacks(pg, affiliateId);
    const response: DataResponse<GetCallbacksResponse> = {
      data: {
        callbacks: await Promise.all(callbacks.map(async (callback) => {
          let link;
          if (callback.linkId) {
            link = await linksRepository.getAffiliateLink(pg, affiliateId, callback.linkId);
          }

          return {
            callbackId: callback.id,
            linkId: callback.linkId,
            code: link && link.code,
            name: link && link.name,
            brandId: callback.brandId,
            method: callback.method,
            trigger: callback.trigger,
            url: callback.url,
            enabled: callback.enabled,
            createdBy: callback.createdBy,
            createdAt: callback.createdAt,
            updatedAt: callback.updatedAt,
          };
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getCallbacksHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateCallbackHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateCallbackHandler request', { session: req.session, params: req.params, body: req.body });

    const { params, body } = req;
    const { params: { affiliateId, callbackId }, callback: callbackDraft } = validate<UpdateCallbackRequest>({ params, ...body }, schemas.updateCallbackSchema);

    const existingCallback = await repository.getCallback(pg, callbackId);
    if (!existingCallback) {
      return res.status(404).json({
        error: { message: 'Callback not found' },
      });
    }

    const affiliate = await affiliatesRepository.getAffiliate(pg, affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const similarCallback = await repository.findCallback(pg, { affiliateId, ...callbackDraft });
    if (similarCallback && similarCallback.id !== callbackId) {
      return res.status(409).json({
        error: { message: 'Callback with this data already exists' },
      });
    }

    // TODO: wrap into transaction
    const callback = await repository.updateCallback(pg, affiliateId, callbackId, callbackDraft);

    const response: DataResponse<UpdateCallbackResponse> = {
      data: {
        callback: {
          callbackId: callback.id,
          linkId: callback.linkId,
          brandId: callback.brandId,
          method: callback.method,
          trigger: callback.trigger,
          url: callback.url,
          enabled: callback.enabled,
          createdBy: callback.createdBy,
          createdAt: callback.createdAt,
          updatedAt: callback.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateCallbackHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteCallbackHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteCallbackHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<DeleteCallbackRequest>({ params }, schemas.deleteCallbackSchema);

    const count = await repository.deleteCallback(pg, request.params.callbackId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'Callback not found' },
      });
    }

    const response: DataResponse<OkResult> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('deleteCallbackHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createCallbackHandler,
  getCallbacksHandler,
  updateCallbackHandler,
  deleteCallbackHandler,
};
