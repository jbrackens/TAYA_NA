-- Sportnation
INSERT INTO games
SELECT nextval('games_id_seq') as "id",
       "order",
       'SN'                    as "brandId",
       "permalink",
       "name",
       "manufacturer",
       "primaryCategory",
       "aspectRatio",
       "viewMode",
       "newGame",
       "jackpot",
       "thumbnailId",
       "searchOnly",
       "active",
       "keywords",
       "tags",
       "parameters",
       "removedAt",
       "promoted"
FROM games
WHERE "brandId" = 'KK';

insert into reward_definitions ("rewardType", "brandId")
values ('extraReward', 'SN')
ON CONFLICT DO NOTHING;


-- Vie
INSERT INTO games
SELECT nextval('games_id_seq') as "id",
       "order",
       'VB'                    as "brandId",
       "permalink",
       "name",
       "manufacturer",
       "primaryCategory",
       "aspectRatio",
       "viewMode",
       "newGame",
       "jackpot",
       "thumbnailId",
       "searchOnly",
       "active",
       "keywords",
       "tags",
       "parameters",
       "removedAt",
       "promoted"
FROM games
WHERE "brandId" = 'KK';

insert into reward_definitions ("rewardType", "brandId")
values ('extraReward', 'VB')
ON CONFLICT DO NOTHING;