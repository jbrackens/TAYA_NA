INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
VALUES ('transaction', 'high_rejection_rate', 0, 0, 'High rejection rate (50% or more within a 24/36/72 hour period)', 'High rejection rate', 'Customer has a high number of rejected deposits/a high rejection rate (50% or more within a 24/36/72 hour period)', NULL)
ON CONFLICT ("fraudKey") DO NOTHING;

INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
VALUES ('transaction', 'high_rejection_count', 0, 0, 'High rejection count: attempted to deposit but has 0 successful deposits in 24h', 'High rejection count', 'Customer has 0 successful deposits in the last 24 hours but has attempted to deposit', NULL)
ON CONFLICT ("fraudKey") DO NOTHING;
