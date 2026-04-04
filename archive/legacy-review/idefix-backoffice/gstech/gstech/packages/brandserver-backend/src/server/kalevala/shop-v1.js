/* @flow */
const _ = require('lodash');
const { localize } = require('../common/localization');
const logger = require('../common/logger');
const coins = require('./coins');
const { createJourney } = require('../common/journey');
const { handleError } = require('../common/extensions');
const {
  apiLoggedIn,
  updateDetails,
} = require('../common/router-helpers');

module.exports = (app: express$Application<express$Request, express$Response>) => {
  app.get('/api/shop', apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);
      const si = await journey.shopItems();
      const shopItems = si.map(item => _.extend({ description: localize(req.context.languageISO)(`kalevala.shop.${item.type !== 'physical' ? item.spintype : ''}${item.type}`, {}, { format: 'markdown' }) }, item));
      return res.json({
        shop: shopItems,
        update: {
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myaccount-shop', 'frontpage']),
        },
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });

  app.post('/api/shop/use/:id', apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const journey = await createJourney(req);

      const shopItem = await coins.use(req, req.params.id);
      logger.debug('BUY', req.user.username, req.params.id, shopItem);
      if (!shopItem) {
        return res.json({ ok: false, [`Invalid shop item ${req.params.id} not found`]: `Invalid shop item ${req.params.id} not found` });
      }

      logger.debug('Used', req.user.username, shopItem);

      return res.json({
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myaccount-shop', 'frontpage']),
        },
        shopItem: shopItem != null ? { action: shopItem.action } : {},
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });


  app.post('/api/shop/:id', apiLoggedIn, async (req: express$Request, res: express$Response) => {
    try {
      const shopItem = await coins.buy(req, req.params.id);
      logger.debug('BUY', req.user.username, req.params.id, shopItem);
      if (!shopItem) {
        return res.json({ ok: false, [`Invalid shop item ${req.params.id} not found`]: `Invalid shop item ${req.params.id} not found` });
      }

      logger.debug('Bought', req.user.username, shopItem);
      const journey = await createJourney(req);

      return res.json({
        update: {
          balance: journey.balance.ui,
          details: await updateDetails(journey),
          banners: journey.updateBanners(req.context, ['myaccount-shop', 'frontpage']),
        },
        shopItem: shopItem != null ? { action: shopItem.action } : {},
      });
    } catch (e) {
      return handleError(req, res, e);
    }
  });
}
