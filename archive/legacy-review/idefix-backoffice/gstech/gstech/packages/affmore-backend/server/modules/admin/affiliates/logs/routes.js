// @flow
import type { CreateAffiliateLogRequest, GetAffiliateLogRequest, CreateAffiliateLogResponse, GetAffiliateLogsResponse } from '../../../../../types/api/logs';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const minio = require('gstech-core/modules/minio');

const config = require('../../../../config');
const affiliatesRepository = require('../repository');
const repository = require('./repository');
const schemas = require('./schemas');

const createAffiliateLogHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createAffiliateLogHandler request', { session: req.session, params: req.params, body: req.body, files: req.files && Object.keys(req.files) });

    const { session, params, body, files } = req;
    const request = validate<CreateAffiliateLogRequest>({ session, params, log: body }, schemas.createAffiliateLogSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    request.log.attachments = files && await Promise.all(files.map(f => new Promise((resolve, reject) => {
        const fileName = `${Date.now()}/${f.originalname}`;
        minio.putObject(config.minio.bucketName, fileName, f.buffer, (error) => {
          if (error) return reject(error);
          return resolve(`/uploads/${fileName}`);
        });
      })
    ));

    const log = await repository.createAffiliateLog(pg, request.log, request.params.affiliateId, request.session.user.id);
    const response: DataResponse<CreateAffiliateLogResponse> = {
      data: {
        log: {
          logId: log.id,

          note: log.note,
          attachments: log.attachments,

          createdBy: log.createdBy,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        },
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('createAffiliateLogHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

const getAffiliateLogsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getAffiliateLogsHandler request', { session: req.session, params: req.params, body: req.body });

    const { params, body } = req;
    const request = validate<GetAffiliateLogRequest>({ params, log: body }, schemas.getAffiliateLogSchema);

    const affiliate = await affiliatesRepository.getAffiliate(pg, request.params.affiliateId);

    if (!affiliate) {
      return res.status(404).json({
        error: { message: 'Affiliate not found' },
      });
    }

    const logs = await repository.getAffiliateLogs(pg, request.params.affiliateId);
    const response: DataResponse<GetAffiliateLogsResponse> = {
      data: {
        logs: logs.map((log) => ({
          logId: log.id,

          note: log.note,
          attachments: log.attachments,

          createdBy: log.createdBy,
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        })),
      },
    };

    return res.json(response);
  } catch (e) {
    logger.error('getAffiliateLogsHandler error', e);
    return res.status(e.httpCode || 500).json({ error: { message: 'Server Error' } });
  }
};

module.exports = {
  getAffiliateLogsHandler,
  createAffiliateLogHandler,
};
