ALTER TABLE payments ADD COLUMN "sessionId" bigint null references sessions;
