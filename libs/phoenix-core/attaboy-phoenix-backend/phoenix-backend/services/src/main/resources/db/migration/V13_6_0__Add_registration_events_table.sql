CREATE TABLE registration_events (
    id          SERIAL              PRIMARY KEY,
    punter_id   character varying   NOT NULL,
    created_at  timestamptz         NOT NULL,
    event       jsonb               NOT NULL    DEFAULT '{}'::jsonb
);

CREATE INDEX "index_punter_id_and_created_at" ON registration_events USING btree (punter_id, created_at);
