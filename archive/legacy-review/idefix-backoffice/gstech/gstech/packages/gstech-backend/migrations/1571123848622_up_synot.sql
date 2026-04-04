insert into game_manufacturers ("id", "name", "active", "parentId") values ('SYN', 'Synot', true, null);
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (32, 'SYN_EightyEightPearls', '88 Pearls', 'SYN', 'EightyEightPearls');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (32, 'LD', 1);
