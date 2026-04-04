INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
		VALUES('transaction', 'velocity_dep3tx_3min', 0, 0, '3 successful deposits within 3 minutes', '3 deposits within 3 minutes', 'Customer made 3 successful deposits within 3 minutes', NULL);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
		VALUES('transaction', 'velocity_dep6tx_12min', 0, 0, '6 successful deposits within 12 minutes', '6 deposits within 12 minutes', 'Customer made 6 successful deposits within 12 minutes', NULL);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
		VALUES('transaction', 'velocity_dep10tx_24h', 0, 0, '10 or more deposits within a rolling 24 hour period', '10 deposits within 24 hours', 'Customer made 10 or more deposits within a rolling 24 hour period', NULL);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "name", "title", "description", "riskProfiles")
		VALUES('transaction', 'no_wagering_between_deps', 0, 0, '2 or more deposits with no gameplay in between', '2 deposits with no gameplay', 'Customer made 2 or more deposits with no gameplay in between', NULL);