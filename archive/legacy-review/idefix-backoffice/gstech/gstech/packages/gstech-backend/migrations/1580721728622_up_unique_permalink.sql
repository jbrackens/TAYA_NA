CREATE UNIQUE index "games_unique_permalink" ON games("permalink", "mobileGame") WHERE permalink IS NOT NULL AND archived=false;

