
CREATE TABLE "AKKA_PROJECTION_OFFSET_STORE" (
    "PROJECTION_NAME" character varying(255) NOT NULL,
    "PROJECTION_KEY" character varying(255) NOT NULL,
    "CURRENT_OFFSET" character varying(255) NOT NULL,
    "MANIFEST" character varying(4) NOT NULL,
    "MERGEABLE" boolean NOT NULL,
    "LAST_UPDATED" bigint NOT NULL,
    PRIMARY KEY ("PROJECTION_NAME", "PROJECTION_KEY")
);

CREATE INDEX "PROJECTION_NAME_INDEX" ON "AKKA_PROJECTION_OFFSET_STORE" USING btree ("PROJECTION_NAME");


CREATE TABLE journal (
    ordering bigserial NOT NULL,
    persistence_id character varying(255) NOT NULL,
    sequence_number bigint NOT NULL,
    deleted boolean DEFAULT false,
    tags character varying(255) DEFAULT NULL::character varying,
    message bytea NOT NULL,
    PRIMARY KEY(persistence_id, sequence_number)
);

CREATE UNIQUE INDEX journal_ordering_idx ON journal USING btree (ordering);


CREATE TABLE snapshot (
    persistence_id character varying(255) NOT NULL,
    sequence_number bigint NOT NULL,
    created bigint NOT NULL,
    snapshot bytea NOT NULL,
    PRIMARY KEY(persistence_id, sequence_number)
);
