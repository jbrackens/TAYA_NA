CREATE TABLE market_exposures (
    market_id character varying NOT NULL,
    selection_id character varying NOT NULL,
    total_staked decimal NOT NULL DEFAULT 0,
    potential_loss decimal NOT NULL DEFAULT 0,
    PRIMARY KEY(market_id, selection_id)
);
