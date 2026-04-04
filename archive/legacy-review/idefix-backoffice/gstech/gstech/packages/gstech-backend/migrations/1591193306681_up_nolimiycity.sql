insert into game_manufacturers ("id", "name", "active", "parentId") values ('NC', 'Nolimit City', true, null);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (36, 'NC_TheCreepyCarnival', 'The Creepy Carnival', 'NC', 'TheCreepyCarnival');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (36, 'LD', 1);
