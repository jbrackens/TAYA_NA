ALTER TABLE punter_time_restricted_sessions
    ADD COLUMN refresh_token_timeout timestamptz NOT NULL DEFAULT '294276-12-31T23:59:59.999999-00:00',
    ALTER COLUMN valid_until DROP NOT NULL,
    ALTER COLUMN block_until DROP NOT NULL;

CREATE INDEX "punter_time_restricted_sessions_refresh_token_timeout" ON punter_time_restricted_sessions USING btree (refresh_token_timeout);