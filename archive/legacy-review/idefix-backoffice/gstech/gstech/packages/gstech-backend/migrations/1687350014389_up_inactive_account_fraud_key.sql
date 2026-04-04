INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints","name", "title", "description", "riskProfiles")
VALUES ('customer', '18mo_inactive', 0, 0, 'Account has been inactive for 18 months', 'Account has been inactive for 18 months', 'Inactive account could be blocked and Payments should be alerted in order to send any remaining balance back to the customers last used payment method', null)
ON CONFLICT ("fraudKey") DO NOTHING;
