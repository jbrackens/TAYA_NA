ALTER TABLE players ADD COLUMN "placeOfBirth" varchar(40) null;
ALTER TABLE players ADD COLUMN "nationality" char(2) null references base_countries;

ALTER TABLE players ADD COLUMN "additionalFields" jsonb null;
