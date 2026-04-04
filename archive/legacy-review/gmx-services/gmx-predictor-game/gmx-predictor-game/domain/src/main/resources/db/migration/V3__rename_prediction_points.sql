ALTER TABLE event_predictions
  RENAME COLUMN index TO points;

ALTER TABLE event_predictions
  ADD COLUMN score INTEGER;