
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
VALUES ('transaction', 'cumulative_deposits_5k', 0, 0, 'Accumulated 5k deposits on account', '5k Accumulated deposits on account', 'Customer has accumulated over €5,000.00 (or currency equivalent) deposits on account.', null)
ON CONFLICT ("fraudKey") DO NOTHING;
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
VALUES ('transaction', 'cumulative_deposits_10k', 0, 0, 'Accumulated 10k deposits on account', '10k Accumulated deposits on account', 'Customer has accumulated over €10,000.00 (or currency equivalent) deposits on account.', null)
ON CONFLICT ("fraudKey") DO NOTHING;
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
VALUES ('transaction', 'cumulative_deposits_25k', 0, 0, 'Accumulated 25k deposits on account', '25k Accumulated deposits on account', 'Customer has accumulated over €25,000.00 (or currency equivalent) deposits on account.', null)
ON CONFLICT ("fraudKey") DO NOTHING;