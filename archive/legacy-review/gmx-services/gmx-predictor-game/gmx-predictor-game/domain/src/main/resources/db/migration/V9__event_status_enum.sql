UPDATE events
SET status = 'NEW';
UPDATE events
SET status = 'FINISHED'
WHERE home_team_score IS NOT NULL;

ALTER TABLE events
  ADD CONSTRAINT ck_events_status CHECK (status IN ('NEW', 'ONGOING', 'FINISHED'));