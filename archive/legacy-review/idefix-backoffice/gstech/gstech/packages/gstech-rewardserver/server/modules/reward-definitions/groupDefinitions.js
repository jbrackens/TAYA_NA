/* @flow */
import type { RewardType, RewardGroup } from 'gstech-core/modules/types/rewards';

const groupDefinitions: {
  [key: BrandId]: {
    groupId: RewardGroup,
    groupName: string,
    rewardTypes: RewardType[],
    balanceGroup?: boolean,
    table: { title: string, property: string, type?: 'timestamp' }[],
  }[],
} = {
  CJ: [
    {
      groupId: 'bounty',
      groupName: 'Bounty',
      rewardTypes: [
        'campaignBounty',
        'bountyCycle',
        'bountyCycleHighrollers',
        'affiliateBounty',
        'otherBounty',
        'wheelSpinContent',
      ],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Bounty', property: 'reward.externalId' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Game', property: 'game.name' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
    {
      groupId: 'wheelSpin',
      groupName: 'Wheel Spin',
      rewardTypes: ['wheelSpin'],
      balanceGroup: true,
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
        { title: 'Result', property: 'result' },
      ],
    },
  ],
  KK: [
    {
      groupId: 'coins',
      groupName: 'Coins',
      rewardTypes: ['iron', 'gold', 'markka'],
      balanceGroup: true,
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Currency', property: 'reward.externalId' },
        { title: 'Quantity', property: 'quantity' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
      ],
    },
    {
      groupId: 'shopItems',
      groupName: 'Shop items',
      rewardTypes: ['shopItem', 'campaignShopItem'],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Shop item', property: 'reward.externalId' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Game', property: 'game.name' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Spin Value', property: 'reward.spinValue' },
        { title: 'Price', property: 'reward.price' },
        { title: 'Currency', property: 'reward.currency' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
    {
      groupId: 'shopItemsV2',
      groupName: 'Shop items V2',
      rewardTypes: ['shopItemV2', 'lootBoxContent'],
      table: [
        { title: 'ID', property: 'reward.externalId' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Game', property: 'game.name' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Spin Value', property: 'reward.spinValue' },
        { title: 'Price', property: 'reward.price' },
        { title: 'Currency', property: 'reward.currency' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
  LD: [
    {
      groupId: 'reward',
      groupName: 'Rewards',
      rewardTypes: [
        'extraReward',
        'affiliateReward',
        'retentionCycle',
        'rewardCycle',
        'rewardCycleHighrollers',
      ],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Reward', property: 'reward.externalId' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Game', property: 'game.name' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
  OS: [
    {
      groupId: 'coins',
      groupName: 'Coins',
      rewardTypes: ['iron', 'gold'],
      balanceGroup: true,
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Currency', property: 'reward.externalId' },
        { title: 'Quantity', property: 'quantity' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
      ],
    },
    {
      groupId: 'shopItems',
      groupName: 'Shop Items',
      rewardTypes: ['shopItem', 'campaignShopItem'],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Shop item', property: 'reward.externalId' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Game', property: 'game.name' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Price', property: 'reward.price' },
        { title: 'Currency', property: 'reward.currency' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
  FK: [
    {
      groupId: 'reward',
      groupName: 'Rewards',
      rewardTypes: [
        'extraReward',
      ],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Reward', property: 'reward.externalId' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Game', property: 'game.name' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
  SN: [
    {
      groupId: 'reward',
      groupName: 'Rewards',
      rewardTypes: [
        'extraReward',
      ],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Reward', property: 'reward.externalId' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Game', property: 'game.name' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
  VB: [
    {
      groupId: 'reward',
      groupName: 'Rewards',
      rewardTypes: [
        'extraReward',
      ],
      table: [
        { title: 'ID', property: 'externalId' },
        { title: 'Reward', property: 'reward.externalId' },
        { title: 'Description', property: 'reward.description' },
        { title: 'Game', property: 'game.name' },
        { title: 'Type', property: 'reward.creditType' },
        { title: 'Spins', property: 'reward.spins' },
        { title: 'Spin Type', property: 'reward.spinType' },
        { title: 'Credited', property: 'creditDate', type: 'timestamp' },
        { title: 'Used', property: 'useDate', type: 'timestamp' },
      ],
    },
  ],
};

module.exports = {
  groupDefinitions,
};
