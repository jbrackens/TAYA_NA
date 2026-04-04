insert into game_manufacturers ("id", "name", "active", "parentId") values ('BFG', 'BF Games', true, null);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (35, 'BFG_BFGcrystal-mania', 'Crystal Mania', 'BFG', 'BFGcrystal-mania');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (35, 'LD', 1);
