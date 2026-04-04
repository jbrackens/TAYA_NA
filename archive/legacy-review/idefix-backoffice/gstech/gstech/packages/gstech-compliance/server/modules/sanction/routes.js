/* @flow */
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const { MiniSearch } = require('./Sanction');
const { sanctionCheckHandlerSchema } = require('./schemas');

const sanctionCheckHandler = (req: express$Request, res: express$Response): express$Response => {
  try {
    const { name } = validate(req.body, sanctionCheckHandlerSchema);
    const result = MiniSearch.getInstance().search(name,  { combineWith: 'AND' });
    const metadata = MiniSearch.getMetadata();
    if (result.length) {
      const match = result[0].name;
      const { list } = result[0];
      logger.debug(
        `sanctionCheckHandler matched "${name}" with "${match}" on list ${list}`,
      );
      return res.json({ matched: true, metadata, match, list });
    }

    logger.debug(`sanctionCheckHandler no matches for name "${name}"`);
    return res.json({ matched: false, metadata });
  } catch (e) {
    logger.error('sanctionCheckHandler', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const multipleSanctionCheckHandler = (req: express$Request, res: express$Response): express$Response => {
  try {
    const { name } = validate(req.body, sanctionCheckHandlerSchema);
    const matches = MiniSearch.getInstance().search(name, { combineWith: 'AND' });
    logger.debug('multipleSanctionCheckHandler', { name, matches });
    const metadata = MiniSearch.getMetadata();
    if (matches.length > 0) {
      logger.debug(`multipleSanctionCheckHandler matched "${name}" with ${matches.length} hits`, { matches });
      return res.json({ matched: true, metadata, matches });
    }

    logger.debug(`multipleSanctionCheckHandler no matches for name "${name}"`);
    return res.json({ matched: false, metadata });
  } catch (e) {
    logger.error('multipleSanctionCheckHandler', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getSanctionListHandler = (req: express$Request, res: express$Response): express$Response => {
  try {
    return res.json(MiniSearch.getInstance());
  } catch (e) {
    logger.error('getSanctionListHandler', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  sanctionCheckHandler,
  multipleSanctionCheckHandler,
  getSanctionListHandler,
};
