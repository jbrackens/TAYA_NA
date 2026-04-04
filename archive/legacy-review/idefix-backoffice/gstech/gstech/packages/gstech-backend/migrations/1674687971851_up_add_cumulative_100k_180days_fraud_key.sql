INSERT INTO risks ( "riskProfiles", "manualCheck", "type", "fraudKey", "points", "maxCumulativePoints", "requiredRole", "active", "manualTrigger", "title", "description", "name")
VALUES (
    NULL,
    't',
    'customer',
    'cumulative_100k_180days',
    20,
    20,
    'agent',
    't',
    't',
    'Recent Cumulative Deposits of €100k+',
    'Player has deposited €100k+ across all brands in the past 6 months (or since last SOW review). SOW must be re-evaluated and **pass-sow** or **fail-sow** tag must be reassigned.',
    '€100k+ cumulative cross-brand deposits in past 6 months, or since last SOW review.'
  );