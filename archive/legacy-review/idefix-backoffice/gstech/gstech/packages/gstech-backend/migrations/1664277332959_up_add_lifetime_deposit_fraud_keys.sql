INSERT INTO risks ( "type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles" )
VALUES ( 'customer', 'lifetime_deposit', 100, 100, 'New Lifetime Deposit Bracket', 'Player has entered a new lifetime deposit 25k-bracket based on all their deposits across linked accounts.', NULL);

INSERT INTO risks ("riskProfiles", "manualCheck", "type", "fraudKey", "points", "maxCumulativePoints", "requiredRole", "active", "manualTrigger", "title", "description", "name") VALUES
(NULL, 't', 'customer', 'lifetime_deposit_75k', 20, 20, 'agent', 't', 't', 'AML: Source Of Wealth (75k+ Lifetime Deposits)', 'Investigate provided SOW details and assign the respective tag: **pass-sow** or **fail-sow**', 'Player has accumulated over €75000 deposits across all of their linked accounts.');

INSERT INTO risks ("riskProfiles", "manualCheck", "type", "fraudKey", "points", "maxCumulativePoints", "requiredRole", "active", "manualTrigger", "title", "description", "name") VALUES
(NULL, 't', 'customer', 'lifetime_deposit_100k_30day', 20, 20, 'agent', 't', 't', 'AML: 100K Lifetime Deposits - 30 Days Expired', 'Review previously provided SOW information and assign the respective tag: **pass-sow** or **fail-sow**', 'Over 30 days since player entered €100000+ bracket, and still does not have ''pass-sow'' or ''fail-sow'' tag.');

