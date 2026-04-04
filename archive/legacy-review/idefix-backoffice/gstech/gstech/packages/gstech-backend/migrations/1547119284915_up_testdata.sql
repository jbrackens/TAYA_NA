insert into users ("id", "hash", "email", "name", "mobilePhone", "handle", "administratorAccess", "campaignAccess")
  values (1, '$2a$10$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i', 'test@luckydino.com', 'Test Support User', '1231231', 'Test', false, false),
         (2, '$2a$10$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i', 'janne@luckydino.com', 'Janne Hietamäki', '358407247680', 'Janne', true, false),
         (3, '$2a$10$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i', 'a.krasikau@gmail.com', 'Aliaksei Krasikau', '551123456', 'Alex', true, true),
         (4, '$2a$10$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i', 'vladimir@luckydino.com', 'Vladimir Kaloshin', '37253020230', 'Vladimir', true, true);

insert into affiliates ("id", "name") values ('100010', 'Test Affiliate');

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values
  (1, 'NTE_junglespirit_not_mobile_sw', 'Jungle Spirit', 'NE', 'junglespirit_not_mobile_sw'),
  (2, 'NTE_wildwildwest_not_mobile_sw', 'Wild Wild West', 'NE', 'wildwildwest_not_mobile_sw'),
  (3, 'NTE_jokerpro_not_mobile_sw', 'Joker Pro', 'NE', 'jokerpro_not_mobile_sw'),
  (4, 'NTE_starburst_not_mobile_sw', 'Starburst', 'NE', 'starburst_not_mobile_sw'),
  (5, 'NTE_eldorado_not_mobile_sw', 'Gonzo''s Quest', 'NE', 'eldorado_not_mobile_sw'),
  (6, 'NTE_megafortune_not_mobile_sw', 'Mega Fortune', 'NE', 'megafortune_not_mobile_sw'),
  (7, 'NTE_baccarat2_sw', 'Baccarat PRO', 'NE', 'baccarat2_sw'),
  (8, 'NTE_bloodsuckers_not_mobile_sw', 'Blood suckers', 'NE', 'bloodsuckers_not_mobile_sw'),
  (9, 'WMS_zeus3', 'Zeus 3', 'SGI', 'zeus3'),
  (10, 'MGS_ImmortalRomance', 'Immortal Romance', 'MGS', 'ImmortalRomance'),
  (17, 'MGS_TombRaider', 'TombRaider', 'MGS', 'TombRaider'),
  (18, 'PP_SugarRush', 'Sugar Rush', 'PP', 'vs20cm'),
  (19, 'YGG_Bicicleta', 'Bicicleta', 'YGG', '7326'),
  (20, 'YGG_OrientExpress', 'Orient Express', 'YGG', '8301'),
  (21, 'HB_BlackJack3H', 'BackJack Three Hands', 'HB', 'BlackJack3H'),
  (22, 'HB_SGAllForOne', 'All for One', 'HB', 'SGAllForOne'),
  (23, 'TK_superdupergame', 'SuperDuperGame', 'TK', 'superdupergame'),
  (24, 'LW_testgame1', 'Test Game 1', 'LW', 'testGame1'),
  (25, 'LW_powerball', 'Powerball', 'LW', 'powerball'),
  (26, 'RTG_DragonsLuck', 'DragonsLuck', 'RTG', 'DragonsLuck');

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId", "mobileGame") values
  (11, 'PNG_towerquest', 'Tower Quest', 'PNG', '287', false),
  (12, 'PNG_towerquestmobile', 'Tower Quest Mobile', 'PNG', '100287', true),
  (13, 'PNG_spinparty', 'Spin Party', 'PNG', '292', false),
  (14, 'PNG_spinpartymobile', 'Spin Party Mobile', 'PNG', '100292', true),
  (15, 'PNG_blackjackmh', 'BlackJack MH', 'PNG', '52', false),
  (16, 'PNG_blackjackmhmobile', 'BlackJack MH Mobile', 'PNG', '100052', true);

insert into promotion_games("promotionId", "gameId") values (8, 1);

insert into brand_game_profiles
  ("gameId", "brandId", "gameProfileId")
values
  (1, 'LD', 1),
  (2, 'LD', 1),
  (3, 'LD', 1),
  (4, 'LD', 1),
  (5, 'LD', 1),
  (6, 'LD', 1),
  (7, 'LD', 4),
  (8, 'LD', 7),
  (9, 'LD', 1),
  (10, 'LD', 1),
  (11, 'LD', 1),
  (12, 'LD', 1),
  (13, 'LD', 1),
  (14, 'LD', 1),
  (15, 'LD', 4),
  (16, 'LD', 4),
  (17, 'LD', 1),
  (18, 'LD', 1),
  (19, 'LD', 1),
  (20, 'LD', 1),
  (21, 'LD', 4),
  (22, 'LD', 1),
  (23, 'LD', 1),
  (24, 'LD', 1),
  (25, 'LD', 1),
  (26, 'LD', 1);

insert into brand_game_profiles
  ("gameId", "brandId", "gameProfileId")
values
  (1, 'CJ', 2),
  (2, 'CJ', 2),
  (3, 'CJ', 2),
  (4, 'CJ', 2),
  (5, 'CJ', 2),
  (6, 'CJ', 2),
  (7, 'CJ', 5),
  (8, 'CJ', 8),
  (9, 'CJ', 2),
  (10, 'CJ', 2),
  (11, 'CJ', 2),
  (12, 'CJ', 2),
  (13, 'CJ', 2),
  (14, 'CJ', 2),
  (15, 'CJ', 5),
  (16, 'CJ', 5),
  (17, 'CJ', 2),
  (18, 'CJ', 2),
  (19, 'CJ', 2),
  (20, 'CJ', 2);

insert into brand_game_profiles
  ("gameId", "brandId", "gameProfileId")
values
  (1, 'KK', 3),
  (2, 'KK', 3),
  (3, 'KK', 3),
  (4, 'KK', 3),
  (5, 'KK', 3),
  (6, 'KK', 3),
  (7, 'KK', 6),
  (8, 'KK', 9),
  (9, 'KK', 3),
  (10, 'KK', 3),
  (11, 'KK', 3),
  (12, 'KK', 3),
  (13, 'KK', 3),
  (14, 'KK', 3),
  (15, 'KK', 6),
  (16, 'KK', 6),
  (17, 'KK', 3),
  (18, 'KK', 3),
  (19, 'KK', 3),
  (20, 'KK', 3);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('LD_FIRST_DEPOSIT', 'LD', 50, true, 1, 100, 30, true);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1001, 'EUR', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1001, 'USD', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1001, 'GBP', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1001, 'SEK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1001, 'NOK', 20000, 200000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('LD_SECOND_DEPOSIT', 'LD', 50, true, 2, 100, 30, true);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1002, 'EUR', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1002, 'USD', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1002, 'GBP', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1002, 'SEK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1002, 'NOK', 20000, 200000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('CJ_FIRST_DEPOSIT', 'CJ', 50, true, 1, 200, 30, true);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1003, 'EUR', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1003, 'USD', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1003, 'GBP', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1003, 'SEK', 25000, 250000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1003, 'NOK', 25000, 250000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('CJ_SECOND_DEPOSIT', 'CJ', 50, true, 2, 100, 30, true);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1004, 'EUR', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1004, 'USD', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1004, 'GBP', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1004, 'SEK', 25000, 250000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1004, 'NOK', 25000, 250000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('CJ_THIRD_DEPOSIT', 'CJ', 50, true, 3, 50, 30, true);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1005, 'EUR', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1005, 'USD', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1005, 'GBP', 2500, 25000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1005, 'SEK', 25000, 250000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1005, 'NOK', 25000, 250000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration", "active") values ('FREESPINS', 'LD', 1, false, false, 30, false);
insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration") values ('LD_MANUAL', 'LD', 50, false, false, 30);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration", "active") values ('FREESPINS', 'CJ', 1, false, false, 30, false);
insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration") values ('CJ_MANUAL', 'CJ', 50, false, false, 30);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration", "active") values ('FREESPINS', 'KK', 1, false, false, 30, false);
insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration") values ('KK_MANUAL', 'KK', 50, false, false, 30);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration", "active", "depositMatchPercentage") values ('DEPOSIT_OFFER_TEST', 'LD', 5, true, false, 30, true, 100);

insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1012, 'EUR', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1012, 'USD', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1012, 'GBP', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1012, 'SEK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1012, 'NOK', 20000, 200000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration") values ('LD_MANUAL_NOWAGER', 'LD', 0, false, false, 30);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1013, 'EUR', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1013, 'USD', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1013, 'GBP', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1013, 'SEK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1013, 'NOK', 20000, 200000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration") values ('LD_AFF5E', 'LD', 0, false, true, 30);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1014, 'EUR', 500, 500);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1014, 'USD', 500, 500);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1014, 'GBP', 500, 500);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1014, 'SEK', 5000, 5000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1014, 'NOK', 5000, 5000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "creditOnce", "daysUntilExpiration","depositMatchPercentage", "depositCountMatch") values ('CJ_Level_5_50upto100EURReload', 'CJ', 5, true, false, 30, 50, false);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1015, 'EUR', 2500, 10000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1015, 'USD', 2500, 10000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1015, 'GBP', 2500, 10000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1015, 'SEK', 25000, 10000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1015, 'NOK', 25000, 10000);

insert into bonuses("name", "brandId", "wageringRequirementMultiplier", "depositBonus", "depositCount", "depositMatchPercentage", "daysUntilExpiration", "depositCountMatch") values ('LD_MONTHLY_RELOAD', 'LD', 50, true, 3, 100, 30, false);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1016, 'EUR', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1016, 'USD', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1016, 'GBP', 2000, 20000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1016, 'SEK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1016, 'NOK', 20000, 200000);

insert into bonuses ("name","description","brandId","active","depositBonus","depositCount","depositCountMatch","wageringRequirementMultiplier","daysUntilExpiration","depositMatchPercentage","creditOnce") values
  ('OS_firstdepo30percent900kr','OS_firstdepo30percent900kr','OS',true,true,1,true,10.0,7.0,30.0,true),
  ('OS_firstdepo100percent3000kr','OS_firstdepo100percent3000kr','OS',true,true,1,true,50.0,7.0,100.0,true),
  ('OS_2nddepo15percent600kr','OS_2nddepo15percent600kr','OS',true,true,2,true,10.0,7.0,15.0,true),
  ('OS_2nddepo50percent2000kr','OS_2nddepo50percent2000kr','OS',true,true,2,true,50.0,7.0,50.0,true),
  ('OS_3rddepo75percent1500kr','OS_3rddepo75percent1500kr','OS',true,true,3,true,50.0,7.0,75.0,true),
  ('OS_3rddepo20percent400kr','OS_3rddepo20percent400kr','OS',true,true,3,true,10.0,7.0,20.0,true);

insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1017, 'NOK', 20000, 90000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1018, 'NOK', 20000, 300000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1019, 'NOK', 20000, 60000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1020, 'NOK', 20000, 200000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1021, 'NOK', 20000, 150000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1022, 'NOK', 20000, 40000);

insert into bonuses ("name","description","brandId","active","depositBonus","depositCount","depositCountMatch","wageringRequirementMultiplier","daysUntilExpiration","depositMatchPercentage","creditOnce") values
  ('KK_firstdepo100percent150e','KK_firstdepo100percent150e','KK',true,true,1,true,10.0,7.0,100.0,true),
  ('KK_firstdepo30percent45e','KK_firstdepo30percent45e','KK',true,true,1,true,50.0,7.0,30.0,true),
  ('KK_2nddepo50percent100e','KK_2nddepo50percent100e','KK',true,true,2,true,10.0,7.0,50.0,true),
  ('KK_2nddepo15percent30e','KK_2nddepo15percent30e','KK',true,true,2,true,50.0,7.0,15.0,true),
  ('KK_3rddepo75percent75e','KK_3rddepo75percent75e','KK',true,true,3,true,50.0,7.0,75.0,true),
  ('KK_3rddepo20percent20e','KK_3rddepo20percent20e','KK',true,true,3,true,10.0,7.0,20.0,true);

insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1023, 'EUR', 2000, 15000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1024, 'EUR', 2000, 4500);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1025, 'EUR', 2000, 10000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1026, 'EUR', 2000, 3000);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1027, 'EUR', 2000, 7500);
insert into bonus_limits ("bonusId", "currencyId", "minAmount", "maxAmount") values (1028, 'EUR', 2000, 2000);

insert into questionnaires ("brandId", "name", "description", "active") values ('LD', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (1, 'pep', 'Politically exposed person', true);

insert into questionnaires ("brandId", "name", "description", "active") values ('LD', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (2, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description") values (2, 'explanation', 'Additional explanation');

insert into questionnaires ("brandId", "name", "description", "active") values ('CJ', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (3, 'pep', 'Politically exposed person', true);

insert into questionnaires ("brandId", "name", "description", "active") values ('CJ', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (4, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description") values (4, 'explanation', 'Additional explanation');

insert into questionnaires ("brandId", "name", "description", "active") values ('KK', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (5, 'pep', 'Politically exposed person', true);

insert into questionnaires ("brandId", "name", "description", "active") values ('KK', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (6, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description") values (6, 'explanation', 'Additional explanation');

insert into questionnaires ("brandId", "name", "description", "active") values ('OS', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (7, 'pep', 'Politically exposed person', true);

insert into questionnaires ("brandId", "name", "description", "active") values ('OS', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (8, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description") values (8, 'explanation', 'Additional explanation');


insert into conversion_rate_histories ("currencyId", "conversionRate") values ('EUR', 1), ('USD', 1), ('GBP', 1), ('SEK', 10), ('NOK', 10);
refresh materialized view conversion_rates;
refresh materialized view monthly_conversion_rates;
