INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles")
VALUES ('interface', 'rollback_insufficient_balance', 40, 40,
        'Player bet cannot be rolled back due to insufficient balance',
        'Please check if a fraud has been committed and if any further action is necessary', null);