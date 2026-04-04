INSERT INTO
  games ("id","order", "brandId", "permalink", "name", "manufacturer", "primaryCategory", "aspectRatio", "viewMode", "newGame", "jackpot", "thumbnailId", "searchOnly", "active", "keywords", "tags", "parameters", "removedAt", "promoted")
VALUES
  (49672, 17497, 'LD', 'blackjackneo', 'Blackjack Neo', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49673, 17498, 'LD', 'erikthered', 'Erik the Red', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49674, 17499, 'LD', 'epicjoker', 'Epic Joker', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49675, 17500, 'LD', 'roulettenouveau', 'Roulette Nouveau', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49676, 17501, 'LD', 'biteme', 'Bite Me!', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49677, 17502, 'LD', 'zombiecircus', 'Zombie Circus', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49678, 17503, 'LD', 'saunapeli', 'Saunapeli', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49679, 17504, 'LD', 'goglenn', 'Go Glenn', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49680, 17505, 'LD', 'wildchemy', 'Wildchemy', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49681, 17506, 'LD', 'thegreatpigsby', 'The Great Pigsby', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49682, 17507, 'LD', 'templetumble', 'Temple Tumble', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49683, 17508, 'LD', 'kingofkings', 'King of Kings', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49684, 17509, 'LD', 'dragonsawakening', 'Dragons'' Awakening', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49685, 17510, 'LD', 'cavemanbob', 'Caveman Bob', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false),
  (49686, 17511, 'LD', 'ignitethenight', 'Ignite the Night', 'Relax', 'VideoSlot', '16x9', 'single', true, false, NULL, false, true, '', '', '{}', null, false)
on conflict ("id") do nothing;
