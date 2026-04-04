insert into game_manufacturers ("id", "name", "active", "parentId") values ('DS', 'Delasport', true, null);
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId", "permalink") values (40, 'delasport', 'Delasport', 'DS', 'delasport', 'delasport');

insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (40, 'LD', 1);
