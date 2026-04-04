insert into game_manufacturers ("id", "name", "active", "parentId") values ('ORX', 'Oryx', true, null);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (33, 'ORX_ORYX_HTML5_AER', 'AER', 'ORX', 'ORYX_HTML5_AER');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (33, 'LD', 1);

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId") values (34, 'ORX_ORYX_MOBILE_AER', 'AER', 'ORX', 'ORYX_MOBILE_AER');
insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values (34, 'LD', 1);
