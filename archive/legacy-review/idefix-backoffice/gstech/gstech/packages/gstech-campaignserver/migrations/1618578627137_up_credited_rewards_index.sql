drop index credited_rewards_player_id_campaign_id;
create unique index credited_rewards_player_id_campaign_id_reward_rules_id
    on credited_rewards ("playerId", "rewardRulesId") where "creditMultiple" is false;
