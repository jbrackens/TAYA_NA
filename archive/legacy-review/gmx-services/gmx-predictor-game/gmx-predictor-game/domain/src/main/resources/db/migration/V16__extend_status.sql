ALTER TABLE events
  DROP CONSTRAINT ck_events_status,
  ADD CONSTRAINT ck_events_status CHECK (status IN ('NEW', 'ONGOING', 'FINISHED', 'VOID'));