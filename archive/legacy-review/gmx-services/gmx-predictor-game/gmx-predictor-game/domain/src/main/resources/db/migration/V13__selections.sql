-- EVENT SELECTIONS
ALTER TABLE events
  ADD COLUMN selection_a_id VARCHAR(22);
ALTER TABLE events
  ADD COLUMN selection_a_details JSONB;
ALTER TABLE events
  ADD COLUMN selection_b_id VARCHAR(22);
ALTER TABLE events
  ADD COLUMN selection_b_details JSONB;


-- POPULATE SELECTIONS
UPDATE events
SET selection_a_id      = home_team_id,
    selection_a_details = to_jsonb(('{"name": "' || home_team_name || '", "score": ' || home_team_score || '}')::JSON),
    selection_b_id      = away_team_id,
    selection_b_details = to_jsonb(('{"name": "' || away_team_name || '", "score": ' || away_team_score || '}')::JSON);

ALTER TABLE events
  ALTER COLUMN selection_a_id SET NOT NULL;

ALTER TABLE events
  ALTER COLUMN selection_b_id SET NOT NULL;