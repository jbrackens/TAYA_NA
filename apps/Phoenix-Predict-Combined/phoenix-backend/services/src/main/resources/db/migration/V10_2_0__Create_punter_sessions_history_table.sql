CREATE TABLE punter_sessions_history (
  session_id       character varying NOT NULL PRIMARY KEY,
  punter_id        character varying NOT NULL,
  start_time       timestamptz       NOT NULL,
  end_time         timestamptz
);

CREATE INDEX "punter_id_sessions" ON punter_sessions_history USING btree (punter_id);