insert into game_manufacturers ("id", "name", "active", "parentId") values ('ELK', 'ELK', true, null);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (37, 'ELK_10014', '10014', 'ELK', '10014');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (37, 'LD', 1);
