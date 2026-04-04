ALTER TABLE currencies add COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('EUR', 'OS', false);
