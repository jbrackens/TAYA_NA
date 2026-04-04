insert into game_manufacturers ("id", "name", "active", "parentId") values ('BOO', 'Booming', true, null);
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (31, 'BOO_TestGame', 'TestGame', 'BOO', '55f2dc09ba36f81816000001');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (31, 'LD', 1);
