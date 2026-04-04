CREATE TABLE event_journal (
  ordering bigserial,
  persistence_id character varying(255) NOT NULL,
  sequence_number bigint NOT NULL,
  deleted boolean DEFAULT FALSE NOT NULL,

  writer character varying(255) NOT NULL,
  write_timestamp bigint,
  adapter_manifest character varying(255),

  event_ser_id integer NOT NULL,
  event_ser_manifest character varying(255) NOT NULL,
  event_payload bytea NOT NULL,

  meta_ser_id integer,
  meta_ser_manifest character varying(255),
  meta_payload bytea,

  PRIMARY KEY(persistence_id, sequence_number)
);

CREATE UNIQUE INDEX event_journal_ordering_idx ON event_journal(ordering);

CREATE TABLE event_tag(
    event_id bigint,
    tag character varying(256),
    PRIMARY KEY(event_id, tag),
    CONSTRAINT fk_event_journal
      FOREIGN KEY(event_id)
      REFERENCES event_journal(ordering)
      ON DELETE CASCADE
);

ALTER TABLE snapshot ADD COLUMN snapshot_ser_id integer NOT NULL;
ALTER TABLE snapshot ADD COLUMN snapshot_ser_manifest character varying(255) NOT NULL;
ALTER TABLE snapshot ADD COLUMN snapshot_payload bytea NOT NULL;
ALTER TABLE snapshot ADD COLUMN meta_ser_id integer;
ALTER TABLE snapshot ADD COLUMN meta_ser_manifest character varying(255);
ALTER TABLE snapshot ADD COLUMN meta_payload bytea;

-- DELETE TABLE journal;
-- ALTER TABLE snapshot DELETE COLUMN snapshot;
