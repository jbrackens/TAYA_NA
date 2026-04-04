ALTER TABLE games DROP CONSTRAINT "games_permalink_brandId_key";

create unique index "games_permalink_brandId_idx" on games ("permalink", "brandId")
  where "removedAt" is null;
