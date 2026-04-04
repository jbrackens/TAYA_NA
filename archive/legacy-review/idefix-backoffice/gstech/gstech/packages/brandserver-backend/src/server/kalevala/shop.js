/* @flow */
import type { Reward, GameWithThumbnail, RewardWithGame } from 'gstech-core/modules/types/rewards';

const _ = require('lodash');

const client = require('gstech-core/modules/clients/rewardserver-api');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const { updateDetails } = require('../common/router-helpers');
const { createJourney } = require('../common/journey');
const { handleError } = require('../common/extensions');
const { shopBalance } = require('./shop-balance');
const { money } = require('../common/utils');
const configuration = require('../common/configuration');
const { localize } = require('../common/modules/localize');

const brandId = configuration.shortBrandId();

const m = (value: Money) => money({ code: 'fi' })(value / 100, 'EUR', value % 100 > 0).replace(/\s/g, '');

type ShopPrice = string;
type ShopCategoryType = 'lootBox' | 'freespins' | 'cash';

const formatShopPrice = (value: any | Money) => (value ? `${value} mk` : '-');

type ShopItemOption = {
  id: Id | string,
  title: string,
  subtitle?: string,
  value: ShopPrice,
  price: Money,
  disabled: boolean,
  description?: string,
  image?: ?string,
};

type ShopItem = {
  id: Id | string,
  image?: ?string,
  title?: string,
  options: ShopItemOption[],
};

type ShopCategory = {
  id: Id | string,
  header: string,
  type: ShopCategoryType,
  items: ShopItem[],
};

type RawOption = {
  id: Id | string,
  title: string,
  subtitle?: string,
  description?: string,
  price: Money,
  value?: string,
  image?: ?string,
};

export type ShopUnusedItem = {
  id: string,
  value: string,
  type: ShopCategoryType,
  title: string,
  image?: string,
};

const orderItems = (balance: number, category: ShopItem[]): ShopItem[] => {
  logger.debug('orderItems', category);
  const result = _.sortBy(category, ({ options }) => {
    if (options.length > 0) {
      const { price } = options[0];
      return balance < price ? price : -price;
    }
    return -1;
  });
  return result;
};

const orderOptions = (balance: number, options: RawOption[]): ShopItemOption[] => {
  const sorted = _.sortBy(options, ({ price }) => (balance < price ? price : -price));
  return sorted.map(({ price, ...rest }) => ({ // Sort stuff player can afford first, most expensive first
    disabled: balance < price,
    value: formatShopPrice(price),
    price,
    ...rest,
  }));
};

const orderCategories = (balance: number, categories: ShopCategory[]) =>
  _.sortBy(categories, (c) => {
    let value = 0;
    if (c.type === 'cash' && balance > 500) {
      value -= 100;
    }
    if(c.items.length > 0 && c.items[0].options.length > 0 && !c.items[0].options[0].disabled) {
      value -= (c.items[0].options[0].price || 0);
    } else {
      value = 100;
    }
    if (c.type === 'lootBox') {
      value *= 2; // Lootbox is considered to be twice as valuable to price because of max win
    }
    return value;
  });

const lootboxCategory = (req: express$Request, lootBoxItems: Array<RewardWithGame>, balance: number): ShopCategory => ({
  id: 1,
  header: 'Sampot',
  type: 'lootBox',
  items: orderItems(balance, lootBoxItems.map(({ reward: lootbox }) => ({
    id: lootbox.id,
    image: `${configuration.cdnBase()}images/sampo/${lootbox.externalId}@2x.jpg`,
    options: orderOptions(balance, [{
      id: `lb/${lootbox.id}`,
      price: lootbox.price || 0,
      description: localize(req, `kalevala.shop.${lootbox.externalId}.description`, {}, { format: 'markdown' }) || '',
      title: localize(req, `kalevala.shop.${lootbox.externalId}.title`) || '',
      subtitle: localize(req, `kalevala.shop.${lootbox.externalId}.subtitle`),
      image: `${configuration.cdnBase()}images/sampo/${lootbox.externalId}_hero@2x.jpg`,
    }]),
  }))),
});

const mapCategory = (reward: Reward): ShopCategoryType => {
  if (reward.creditType === 'real') {
    return 'cash';
  }
  if (reward.creditType === 'lootBox') {
    return 'lootBox';
  }
  return 'freespins';
};

const freespinsCategory = (
  req: express$Request,
  freeSpinsItems: { [key: string]: Array<RewardWithGame> },
  balance: number,
): ShopCategory => {
  const games = Object.keys(freeSpinsItems).map((gameId) => {
    const rewards: any[] = freeSpinsItems[gameId];
    const { game } = rewards[0];
    return {
      id: gameId,
      image: `${configuration.thumbsCdnBase()}thumbs/max/${game.thumbnail}`,
      title: `${game.name} ilmaiskierrokset`,
      options: orderOptions(
        balance,
        rewards.map(({ reward }) => ({
          id: reward.id,
          title: `${reward.spins} ilmaiskierrosta`,
          subtitle: `Kierroksen arvo ${m(reward.spinValue)}`,
          value: formatShopPrice(reward.price || 0),
          price: reward.price || 0,
        })),
      ),
    };
  });
  // $FlowFixMe[incompatible-call]
  const items = orderItems(balance, games);

  return {
    id: 2,
    header: 'Ilmaiskierrokset',
    type: 'freespins',
    items,
  };
};

const realMoneyCategory = (
  req: express$Request,
  realMoneyItems: Array<RewardWithGame>,
  balance: number,
): ShopCategory => ({
  id: 3,
  header: 'Käteisbonukset',
  type: 'cash',
  items: orderItems(balance, [
    {
      id: 1,
      options: orderOptions(
        balance,
        realMoneyItems.map(({ reward }) => ({
          id: reward.id,
          title: `${m(reward.cost || 0)} käteistä`,
          price: reward.price || 0,
        })),
      ),
    },
  ]),
});

const ledgerTitles = {
  freespins: 'Ilmaiskierrosta',
  cash: 'Käteistä',
  lootBox: 'Sampo',
  bonus: 'Talletusbonus',
};

const mapValue = (reward: Reward) => {
  if (reward.creditType === 'real') {
    return `${m(reward.cost || 0)}`;
  }
  if (reward.creditType === 'freeSpins') {
    return `${String(reward.spins)} arvo ${m(reward.spinValue || 0)}`;
  }
  return '';
};

const mapUnusedLedgers = (ledgers: { id: Id, game?: GameWithThumbnail, reward: Reward }[]): ShopUnusedItem[] =>
  ledgers.map(({ id, game, reward }) => ({
      id: `use/${id}`,
      value: mapValue(reward),
      type: mapCategory(reward),
      title: ledgerTitles[mapCategory(reward)],
      image: game && `${configuration.thumbsCdnBase()}thumbs/max/${game.thumbnail}`,
    }));

const shopHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('shopHandler', { body: req.body });

    const unusedItems = await client.getUnusedLedgers(brandId, req.context.playerId, { rewardType: 'lootBoxContent' });
    const shopItems = await client.getAvailableRewards(brandId, { rewardType: 'shopItemV2' });
    const journey = await createJourney(req);

    const { balance } = await shopBalance(journey);
    const { ledgers: items } = unusedItems;
    const lootBoxItems = shopItems.filter(r => r.reward.creditType === 'lootBox');
    const realMoneyItems = shopItems.filter(r => r.reward.creditType === 'real');
    const freeSpinsItems: {[key: string]: RewardWithGame[]} = _.groupBy(
      shopItems.filter(r => r.reward.creditType === 'freeSpins'),
      ai => ai.game && ai.game.permalink,
    );

    const response = {
      shop: {
        version: 2,
        items: mapUnusedLedgers(items.map(({ id, game, reward }) => ({ id, game, reward}))),
        categories: orderCategories(balance, [
          lootboxCategory(req, lootBoxItems, balance),
          freespinsCategory(req, freeSpinsItems, balance),
          realMoneyCategory(req, realMoneyItems, balance),
        ]),
        info: [{
          title: localize(req, 'kalevala.shop.description.1.title') || '',
          content: localize(req, 'kalevala.shop.description.1.content', {}, { format: 'markdown' }) || '',
        },
        {
          title: localize(req, 'kalevala.shop.description.2.title') || '',
          content: localize(req, 'kalevala.shop.description.2.content', {}, { format: 'markdown' }) || '',
        },
        {
          title: localize(req, 'kalevala.shop.description.3.title') || '',
          content: localize(req, 'kalevala.shop.description.3.content', {}, { format: 'markdown' }) || '',
        },
        {
          title: localize(req, 'kalevala.shop.description.4.title') || '',
          content: localize(req, 'kalevala.shop.description.4.content', {}, { format: 'markdown' }) || '',
        }],
      },
      update: {
        details: await updateDetails(journey),
      },
    };
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const exchangeShopItemSchema = joi.object({
  rewardId: joi.number().integer().required(),
}).options({ stripUnknown: true });

const createAction = (results: any[]) => { // { reward: Reward, game?: GameWithThumbnail, ... }
  if (results.length > 0) {
    const [{ reward, game }] = results;
    if (reward.creditType === 'freeSpins' && game != null) {
      return `/loggedin/game/${game.permalink}/`;
    }
  }
  return '/loggedin/myaccount/shop/';
};

const buyHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('buyHandler', { body: req.body });

    const { rewardId } = validate<{ rewardId: Id }>(req.params, exchangeShopItemSchema);
    const results = await client.exchangeReward(brandId, rewardId, req.context.playerId);

    const journey = await createJourney(req);
    const response = {
      shopItem: { action: createAction(results) },
      update: {
        details: await updateDetails(journey),
      },
      ok: !!results,
    };
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const openLootbox = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('openLootbox', { body: req.body });
    const journey = await createJourney(req);
    const response = {
      shopItem: { action: `/loggedin/lootbox/${req.params.rewardId}` },
      update: {
        details: await updateDetails(journey),
      },
      ok: true,
    };
    logger.debug('openLootbox response', response);
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const buyLootbox = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('buyLootbox', { body: req.body });

    const { rewardId } = validate<{ rewardId: Id }>(req.params, exchangeShopItemSchema);

    const data = await client.exchangeReward(brandId, rewardId, req.context.playerId);
    const journey = await createJourney(req);
    const { reward: lootbox } = await client.getRewardInfo(rewardId);
    const response = {
      items: mapUnusedLedgers(data.map(({ id, game, reward }) => ({ id, game, reward}))),
      video: `${configuration.cdnBase()}images/sampo/${lootbox.externalId}.mp4`,
      loopVideo: `${configuration.cdnBase()}images/sampo/KKLootBox_10_loop.mp4`,
      update: {
        details: await updateDetails(journey),
      },
      ok: true, // data.ok,
    };
    logger.debug('exchangeReward result', { rewardId }, lootbox, response, data);
    logger.debug('buyLootbox response', response);
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const useItemSchema = joi.object({
  ledgerId: joi.number().integer().required(),
}).options({ stripUnknown: true });

const useHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('useShopItem', { body: req.body });

    const { ledgerId } = validate<{ ledgerId: Id }>(req.params, useItemSchema);

    const result = await client.useLedger(brandId, ledgerId, req.context.playerId);
    const journey = await createJourney(req);
    const response = {
      shopItem: { action: createAction(result) },
      update: {
        details: await updateDetails(journey),
      },
      ok: result.length > 0,
    };
    return res.json(response);
  } catch (e) {
    return handleError(req, res, e);
  }
};


module.exports = { shopHandler, buyHandler, useHandler, buyLootbox, openLootbox };
