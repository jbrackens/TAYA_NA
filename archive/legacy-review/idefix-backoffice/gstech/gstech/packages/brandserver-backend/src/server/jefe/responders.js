/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { Player, DepositDetails } from '../common/api';

const logger = require('../common/logger');
const bounties = require('./bounties');
const { Money } = require('../common/money');
const utils = require('../common/utils');
const { optInToPromotion } = require('../common/modules/promotion');

const datastorage = require('../common/datastorage');

const register = async (user: Player, req: express$Request): Promise<void> => { // eslint-disable-line no-unused-vars
};

const creditBounty = async (user: Player, bountyid: string, id: string) => {
  await bounties.addToUser([{ id, bountyid, crediting: 'instant' }], user);
};

const creditBountyCampaign = (
  user: Player,
  minAmount: number,
  maxAmount: number,
  bountyid: string,
  id: string,
  campaign: mixed,
  campaignDef: mixed,
  d: DepositDetails,
) => {
  logger.debug('updateCampaignDeposit', campaign, campaignDef);
  const value = new Money(d.amountValue, user.details.CurrencyISO).asBaseCurrency().asFixed();
  if (value >= 100 * minAmount && value < 100 * maxAmount) {
    logger.debug('Campaign deposit matched for bounty', d);
    return creditBounty(user, bountyid, id);
  }
};

const creditCampaigns = async (req: express$Request, depositDetails: DepositDetails) => {
  const tags = [
    `deposits-${depositDetails.index}`,
    ...(depositDetails.tags || []),
  ];
  for (const campaign of Array.from(datastorage.campaigns())) {
    const matchTags = utils.matchAllTags(campaign.tags, tags);
    if (matchTags && req.user.numDeposits > campaign.mindeposits) {
      const id = campaign.creditmultiple ? `${campaign.id}-${req.user.numDeposits}` : campaign.id;
      if (campaign.type === 'bounty') {
        await creditBountyCampaign(req.user, campaign.minimumdeposit, campaign.maximumdeposit, campaign.credit, id, id, campaign, depositDetails);
      } else {
        logger.debug('Campaign did not match', campaign);
      }
    }
  }
};

const deposit = async (user: Player, req: express$Request, value: CMoney, tags: string[], depositDetails: DepositDetails) => {
   
  await creditCampaigns(req, depositDetails);

  logger.debug('Process Jefe deposit', user.username, user.numDeposits, value, tags);
  if (req.user.numDeposits === 1) {
    logger.debug('First deposit. opt in to promotion', user.username);
    await optInToPromotion(req, 'CJ_Bounties_new');
  }
};

// eslint-disable-next-line no-unused-vars
const login = async (user: Player, req: express$Request) => {

};

module.exports = { register, deposit, login };
