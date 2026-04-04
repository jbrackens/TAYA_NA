-- TODO: this column but become unique and not nullable with later migration
ALTER TABLE games ADD COLUMN "permalink" varchar(200) null;
