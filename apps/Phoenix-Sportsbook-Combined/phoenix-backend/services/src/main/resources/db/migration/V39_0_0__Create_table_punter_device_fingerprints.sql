CREATE TABLE punter_device_fingerprints
(
    punter_id  character varying NOT NULL,
    timestamp timestamptz NOT NULL,
    visitor_id character varying NOT NULL,
    confidence real NOT NULL
);