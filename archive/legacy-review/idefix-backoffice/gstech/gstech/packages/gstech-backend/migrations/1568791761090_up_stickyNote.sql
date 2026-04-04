ALTER TABLE players ADD COLUMN "stickyNoteId" bigint null references player_events;
