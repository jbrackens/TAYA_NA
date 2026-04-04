INSERT INTO game_profiles ("id", "brandId", "name", "wageringMultiplier") VALUES
(13, 'FK', 'Slots', 100),
(14, 'FK', 'Table games', 0),
(15, 'FK', 'Live', 0),
(16, 'FK', 'Jackpot', 0),
(17, 'FK', 'Limited wagering', 50);

INSERT INTO brand_game_profiles SELECT "gameId", 'FK' as "brandId", 13 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'KK' and brand_game_profiles."gameProfileId" = 3;
INSERT INTO brand_game_profiles SELECT "gameId", 'FK' as "brandId", 14 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'KK' and brand_game_profiles."gameProfileId" = 6;
INSERT INTO brand_game_profiles SELECT "gameId", 'FK' as "brandId", 15 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'KK' and brand_game_profiles."gameProfileId" = 110;
INSERT INTO brand_game_profiles SELECT "gameId", 'FK' as "brandId", 16 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'KK' and brand_game_profiles."gameProfileId" = 114;
INSERT INTO brand_game_profiles SELECT "gameId", 'FK' as "brandId", 17 as "gameProfileId" FROM brand_game_profiles WHERE brand_game_profiles."brandId" = 'KK' and brand_game_profiles."gameProfileId" = 9;
