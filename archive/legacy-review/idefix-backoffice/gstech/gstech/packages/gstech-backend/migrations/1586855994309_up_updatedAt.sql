CREATE FUNCTION trigger_set_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE players ADD COLUMN "updatedAt" timestamptz not null default now();
CREATE TRIGGER players_updated AFTER UPDATE ON players FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated();

ALTER TABLE player_segments ADD COLUMN "updatedAt" timestamptz not null default now();
CREATE TRIGGER player_segments_updated AFTER UPDATE ON player_segments FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated();

ALTER TABLE payments ADD COLUMN "updatedAt" timestamptz not null default now();
CREATE TRIGGER payments_updated AFTER UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated();

ALTER TABLE report_hourly_players ADD COLUMN "updatedAt" timestamptz not null default now();
ALTER TABLE report_daily_brands ADD COLUMN "updatedAt" timestamptz not null default now();
ALTER TABLE report_daily_games_brands ADD COLUMN "updatedAt" timestamptz not null default now();
ALTER TABLE report_daily_player_game_summary ADD COLUMN "updatedAt" timestamptz not null default now();
ALTER TABLE account_statements ADD COLUMN "updatedAt" timestamptz not null default now();
