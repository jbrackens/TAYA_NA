// @flow
import type { CreateLandingRequest, GetLandingsRequest, UpdateLandingRequest, DeleteLandingRequest, GetLandingsResponse, CreateLandingResponse, UpdateLandingResponse } from '../../../../types/api/landings';

const { Router } = require('express');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const schemas = require('./schemas');

const router: express$Router<> = Router(); // eslint-disable-line

const createLandingHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createLandingHandler request', { session: req.session, params: req.params, body: req.body });

    const { session, body } = req;
    const request = validate<CreateLandingRequest>({ session, landing: body }, schemas.createLandingSchema);

    const landing = await repository.createLanding(pg, request.landing, request.session.user.id);
    const response: DataResponse<CreateLandingResponse> = {
      data: {
        landing: {
          landingId: landing.id,
          brandId: landing.brandId,
          landingPage: landing.landingPage,

          createdBy: landing.createdBy,
          createdAt: landing.createdAt,
          updatedAt: landing.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createLandingHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getLandingsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getLandingsHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<GetLandingsRequest>({ params }, schemas.getLandingsSchema);

    const landings = await repository.getLandingsWithStatistics(pg, request.params.brandId);
    const response: DataResponse<GetLandingsResponse> = {
      data: {
        landings: landings.map(landing => ({
          landingId: landing.id,

          brandId: landing.brandId,
          landingPage: landing.landingPage,

          createdBy: landing.createdBy,
          createdAt: landing.createdAt,
          updatedAt: landing.updatedAt,

          usages: landing.usages,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getLandingsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const updateLandingHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateLandingHandler request', { session: req.session, params: req.params, body: req.body });

    const { params, body } = req;
    const request = validate<UpdateLandingRequest>({ params, landing: body }, schemas.updateLandingSchema);

    const landing = await repository.updateLanding(pg, request.params.landingId, request.landing);

    if (!landing) {
      return res.status(404).json({
        error: { message: 'Landing not found' },
      });
    }

    const response: DataResponse<UpdateLandingResponse> = {
      data: {
        landing: {
          landingId: landing.id,
          brandId: landing.brandId,
          landingPage: landing.landingPage,

          createdBy: landing.createdBy,
          createdAt: landing.createdAt,
          updatedAt: landing.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('updateLandingHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const deleteLandingHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteLandingHandler request', { session: req.session, params: req.params, body: req.body });

    const { params } = req;
    const request = validate<DeleteLandingRequest>({ params }, schemas.deleteLandingSchema);

    const count = await repository.deleteLanding(pg, request.params.landingId);
    if (!count) {
      return res.status(404).json({
        error: { message: 'Landing not found' },
      });
    }

    const response: DataResponse<OkResult> = {
      data: {
        ok: true,
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('deleteLandingHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  createLandingHandler,
  getLandingsHandler,
  updateLandingHandler,
  deleteLandingHandler,
};
