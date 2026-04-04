-- columns not required - TO BE REMOVED
ALTER TABLE events
  ALTER COLUMN home_team_name DROP NOT NULL;
ALTER TABLE events
  ALTER COLUMN home_team_id DROP NOT NULL;
ALTER TABLE events
  ALTER COLUMN away_team_name DROP NOT NULL;
ALTER TABLE events
  ALTER COLUMN away_team_id DROP NOT NULL;


ALTER TABLE events
  ADD COLUMN event_details JSONB;