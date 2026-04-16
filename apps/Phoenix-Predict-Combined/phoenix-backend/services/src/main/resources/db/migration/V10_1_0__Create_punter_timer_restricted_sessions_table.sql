CREATE TABLE punter_time_restricted_sessions (
  session_id       character varying NOT NULL PRIMARY KEY,
  punter_id        character varying NOT NULL,
  started_at       timestamptz       NOT NULL,
  valid_until      timestamptz       NOT NULL,
  block_until      timestamptz       NOT NULL
);

CREATE INDEX "punter_time_restricted_sessions_valid_until" ON punter_time_restricted_sessions USING btree (valid_until);