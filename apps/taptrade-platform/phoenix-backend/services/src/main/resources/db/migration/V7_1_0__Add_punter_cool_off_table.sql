CREATE TABLE punter_cool_offs (
    punter_id      character varying NOT NULL PRIMARY KEY,
    cool_off_start timestamptz       NOT NULL,
    cool_off_end   timestamptz       NOT NULL
);

CREATE INDEX "punter_cool_offs_end" ON punter_cool_offs USING btree (cool_off_end);
