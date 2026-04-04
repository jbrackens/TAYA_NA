-- drop columns migrated to selections
ALTER TABLE events
  DROP COLUMN home_team_name;
ALTER TABLE events
  DROP COLUMN home_team_id;
ALTER TABLE events
  DROP COLUMN home_team_score;
ALTER TABLE events
  DROP COLUMN away_team_name;
ALTER TABLE events
  DROP COLUMN away_team_id;
ALTER TABLE events
  DROP COLUMN away_team_score;
