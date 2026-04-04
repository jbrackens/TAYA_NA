CREATE MATERIALIZED VIEW IF NOT EXISTS tournament_standings AS
SELECT promotions.name "promotionName",
  username,
  round(amount / 100, 2) "points"
FROM player_counters
  JOIN promotions ON promotions.id = player_counters."promotionId"
  JOIN players ON players.id = player_counters."playerId"
WHERE player_counters."promotionId" IS NOT NULL
  AND player_counters."createdAt" >= date_trunc('week', NOW()::timestamptz - INTERVAL '1 week')
ORDER BY amount DESC