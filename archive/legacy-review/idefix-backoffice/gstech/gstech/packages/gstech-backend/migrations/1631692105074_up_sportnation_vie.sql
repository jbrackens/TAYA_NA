-- Sportnation
INSERT INTO brands ("id", "name") VALUES ('SN', 'Sportnation');

INSERT INTO languages ("id", "brandId") VALUES ('en', 'SN');

INSERT INTO currencies ("brandId", "id") VALUES ('SN', 'EUR');
INSERT INTO countries VALUES ('EE', 'SN', 18, true, true, false, 'low', NULL);
INSERT INTO countries VALUES ('NL', 'SN', 18, true, true, false, 'low', NULL);
INSERT INTO countries VALUES ('MT', 'SN', 18, true, true, false, 'low', NULL);

INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (250, 15, 'SN', 'EUR', 2000, 1000000, 2500, 10000000);
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (20, 'SN', 'EUR', 2000, 200000, 3000, 300000);
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('SN', 20, 'EUR');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('SN', 20, 'EE');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('SN', 20, 'NL');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('SN', 20, 'MT');

INSERT INTO game_profiles ("id", "brandId", "name", "wageringMultiplier") VALUES
(18, 'SN', 'Slots', 100),
(19, 'SN', 'Table games', 0),
(20, 'SN', 'Live', 0),
(21, 'SN', 'Jackpot', 0),
(22, 'SN', 'Limited wagering', 50);

INSERT INTO brand_game_profiles SELECT "gameId", 'SN' as "brandId", 18 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 13;
INSERT INTO brand_game_profiles SELECT "gameId", 'SN' as "brandId", 19 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 14;
INSERT INTO brand_game_profiles SELECT "gameId", 'SN' as "brandId", 20 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 15;
INSERT INTO brand_game_profiles SELECT "gameId", 'SN' as "brandId", 21 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 16;
INSERT INTO brand_game_profiles SELECT "gameId", 'SN' as "brandId", 22 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 17;

insert into questionnaires ("id", "brandId", "name", "description", "active") values (38, 'SN', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (38, 'pep', 'Politically exposed person', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (39, 'SN', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (39, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (39, 'explanation', 'Additional explanation', false);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (40, 'SN', 'Total_Deposits_5k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (40, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (41, 'SN', 'Total_Deposits_10k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (41, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (42, 'SN', 'Total_Deposits_15k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (42, 'ltd', 'Satisfied with deposit amount', true);


-- VIE
INSERT INTO brands ("id", "name") VALUES ('VB', 'Vie');

INSERT INTO languages ("id", "brandId") VALUES ('en', 'VB');

INSERT INTO currencies ("brandId", "id") VALUES ('VB', 'EUR');
INSERT INTO countries VALUES ('EE', 'VB', 18, true, true, false, 'low', NULL);
INSERT INTO countries VALUES ('NL', 'VB', 18, true, true, false, 'low', NULL);
INSERT INTO countries VALUES ('MT', 'VB', 18, true, true, false, 'low', NULL);

INSERT INTO payment_method_limits ("id", "paymentMethodId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (251, 15, 'VB', 'EUR', 2000, 1000000, 2500, 10000000);
INSERT INTO payment_provider_limits ("paymentProviderId", "brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal", "maxWithdrawal") VALUES (20, 'VB', 'EUR', 2000, 200000, 3000, 300000);
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('VB', 20, 'EUR');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('VB', 20, 'EE');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('VB', 20, 'NL');
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('VB', 20, 'MT');

INSERT INTO game_profiles ("id", "brandId", "name", "wageringMultiplier") VALUES
(23, 'VB', 'Slots', 100),
(24, 'VB', 'Table games', 0),
(25, 'VB', 'Live', 0),
(26, 'VB', 'Jackpot', 0),
(27, 'VB', 'Limited wagering', 50);

INSERT INTO brand_game_profiles SELECT "gameId", 'VB' as "brandId", 23 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 13;
INSERT INTO brand_game_profiles SELECT "gameId", 'VB' as "brandId", 24 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 14;
INSERT INTO brand_game_profiles SELECT "gameId", 'VB' as "brandId", 25 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 15;
INSERT INTO brand_game_profiles SELECT "gameId", 'VB' as "brandId", 26 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 16;
INSERT INTO brand_game_profiles SELECT "gameId", 'VB' as "brandId", 27 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'FK' and brand_game_profiles."gameProfileId" = 17;

insert into questionnaires ("id", "brandId", "name", "description", "active") values (43, 'VB', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (43, 'pep', 'Politically exposed person', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (44, 'VB', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (44, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (44, 'explanation', 'Additional explanation', false);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (45, 'VB', 'Total_Deposits_5k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (45, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (46, 'VB', 'Total_Deposits_10k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (46, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (47, 'VB', 'Total_Deposits_15k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (47, 'ltd', 'Satisfied with deposit amount', true);

