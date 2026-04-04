CREATE TABLE rounds (
  id         VARCHAR(22) NOT NULL,
  number     INTEGER     NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  CONSTRAINT pk_rounds PRIMARY KEY (id)
);

ALTER TABLE user_predictions
  DROP COLUMN round_no;

ALTER TABLE user_predictions
  ADD COLUMN round_id VARCHAR(22) NOT NULL DEFAULT '';

ALTER TABLE user_predictions
  ADD CONSTRAINT fk_user_predictions_round_id FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_user_predictions_round_id
  ON user_predictions (round_id);

ALTER TABLE events
  DROP COLUMN round_no;

ALTER TABLE events
  ADD COLUMN round_id VARCHAR(22) NOT NULL DEFAULT '';

ALTER TABLE events
  ADD CONSTRAINT fk_events_round_id FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_events_round_id
  ON events (round_id);