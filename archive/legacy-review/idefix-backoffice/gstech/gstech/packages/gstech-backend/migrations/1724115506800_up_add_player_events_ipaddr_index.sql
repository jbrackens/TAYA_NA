CREATE INDEX CONCURRENTLY IF NOT EXISTS player_events_ipaddr ON player_events ((details->>'IPAddress'))
INCLUDE ("playerId", "key", "createdAt")
WHERE "key" IN('login', 'invalidLoginAttempt', 'registration');
