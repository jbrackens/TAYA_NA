alter table player_counters add constraint "player_counter_type_deposit_campaign_requires_paymentId" check ("type" <> 'deposit_campaign' or "paymentId" is not null);
drop index player_counter_paymentId_uniq_key;
create unique index "player_counter_paymentId_uniq_key" on player_counters("playerId", "paymentId", "type") where "paymentId" is not null;