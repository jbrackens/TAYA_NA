insert into game_manufacturers ("id", "name", "active", "parentId") values ('BBY', 'Betby', true, null);
insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId", "permalink") values (38, 'betby', 'Betby', 'BBY', 'betby', 'betby');

insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (38, 'LD', 1);
