insert into game_manufacturers ("id", "name", "active", "parentId") values ('EYE', 'Eyecon', true, null);
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (27, 'EYE_TempleOfAusar', 'Temple Of Ausar', 'EYE', '67582');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (27, 'LD', 1);