update game_manufacturers set active = true where id = 'RLX';

insert into games ("id", "gameId", "name", "manufacturerId", "manufacturerGameId", "parameters", "permalink") values
(18379, 'RLX_blackjackneo', 'Blackjack Neo', 'RLX', 'blackjackneo', NULL, 'blackjackneo'),
(18380, 'RLX_erikthered', 'Erik the Red', 'RLX', 'erikthered', '{"betAmounts": [10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000]}', 'erikthered'),
(18381, 'RLX_epicjoker', 'Epic Joker', 'RLX', 'epicjoker', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000,12500,15000,20000]}', 'epicjoker'),
(18382, 'RLX_roulettenouveau', 'Roulette Nouveau', 'RLX', 'roulettenouveau', NULL, 'roulettenouveau'),
(18383, 'RLX_biteme', 'Bite Me!', 'RLX', 'biteme', '{"betAmounts":[25,50,75,100,125,250,500,750,1000,1250,2500,5000,10000]}', 'biteme'),
(18384, 'RLX_zombiecircus', 'Zombie Circus', 'RLX', 'zombiecircus', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000]}', 'zombiecircus'),
(18385, 'RLX_saunapeli', 'Saunapeli', 'RLX', 'saunapeli', '{"betAmounts":[50,75,100,125,250,500,750,1000,1250,2500,5000,10000]}', 'saunapeli'),
(18386, 'RLX_goglenn', 'Go Glenn', 'RLX', 'goglenn', '{"betAmounts":[50,75,100,125,250,500,750,1000,1250,2500,5000,10000]}', 'goglenn'),
(18387, 'RLX_wildchemy', 'Wildchemy', 'RLX', 'wildchemy', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000]}', 'wildchemy'),
(18388, 'RLX_thegreatpigsby', 'The Great Pigsby', 'RLX', 'thegreatpigsby', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000,12500,15000,20000]}', 'thegreatpigsby'),
(18389, 'RLX_templetumble', 'Temple Tumble', 'RLX', 'templetumble', '{"betAmounts":[20,40,60,80,100,160,200,300,500,800,1000,1200,1500,2000,3000,5000,8000,10000]}', 'templetumble'),
(18390, 'RLX_kingofkings', 'King of Kings', 'RLX', 'kingofkings', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000]}', 'kingofkings'),
(18391, 'RLX_dragonsawakening', 'Dragons'' Awakening', 'RLX', 'dragonsawakening', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000]}', 'dragonsawakening'),
(18392, 'RLX_cavemanbob', 'Caveman Bob', 'RLX', 'cavemanbob', '{"betAmounts":[40,60,80,100,160,200,300,500,800,1000,1200,1500,2000,3000,5000,8000,10000]}', 'cavemanbob'),
(18393, 'RLX_ignitethenight', 'Ignite the Night', 'RLX', 'ignitethenight', '{"betAmounts":[10,20,30,50,80,100,150,200,300,500,800,1000,1250,1500,2000,3000,5000,8000,10000]}', 'ignitethenight')
on conflict ("id") do nothing;

insert into brand_game_profiles ("gameId", "brandId", "gameProfileId") values
(18379, 'LD', 1),
(18380, 'LD', 1),
(18381, 'LD', 1),
(18382, 'LD', 1),
(18383, 'LD', 1),
(18384, 'LD', 1),
(18385, 'LD', 1),
(18386, 'LD', 1),
(18387, 'LD', 1),
(18388, 'LD', 1),
(18389, 'LD', 1),
(18390, 'LD', 1),
(18391, 'LD', 1),
(18392, 'LD', 1),
(18393, 'LD', 1)
on conflict ("gameId", "brandId") do nothing;
