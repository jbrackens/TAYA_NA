CREATE TABLE displayable_markets (
    sport_id character varying NOT NULL,
    market_category character varying NOT NULL,
    visibility character varying NOT NULL,

    PRIMARY KEY(sport_id, market_category)
);