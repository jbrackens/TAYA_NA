insert into game_manufacturers ("id", "name", "active", "parentId") values ('EVO', 'Evolution', true, null);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (28, 'EVO_blackjack', 'Blackjack', 'EVO', 'blackjack');
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (29, 'EVO_roulette', 'Roulette', 'EVO', 'roulette');
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (30, 'EVO_poker', 'Poker', 'EVO', 'poker');

insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (28, 'LD', 1);
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (29, 'LD', 1);
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (30, 'LD', 1);
