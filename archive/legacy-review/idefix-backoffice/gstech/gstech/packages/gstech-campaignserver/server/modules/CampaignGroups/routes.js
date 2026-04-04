/* @flow */

const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const schemas = require('./schemas');
const repository = require('./repository');

const archiveGroup = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('archiveGroup request', { group: req.campaignGroup });

    const { campaignGroup } = (req: any);

    await repository.archiveGroup(pg, campaignGroup.id);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('archiveGroup error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const duplicateGroup = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('duplicateGroup request', { group: req.campaignGroup });

    const { campaignGroup } = (req: any);

    const result = await repository.duplicateGroup(pg, campaignGroup);

    const response: DataResponse<{ id: Id, firstCampaignId: Id }> = { data: result };
    return res.json(response);
  } catch (e) {
    logger.error('duplicateGroup error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateGroupName = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('updateGroupName request', { group: req.campaignGroup, body: req.body });

    const { name } = validate(req.body, schemas.updateGroupNameSchema);

    await repository.updateGroup(pg, req.campaignGroup.id, name);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('updateGroupName error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  archiveGroup,
  duplicateGroup,
  updateGroupName,
};
