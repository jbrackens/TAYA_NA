CREATE TABLE admin_fees (
  "id" serial PRIMARY KEY,
  "draftId" int UNIQUE REFERENCES admin_fees(id),
  "name" varchar(255) NOT NULL,
  "percent" smallint NULL DEFAULT NULL,
  "active" bool NOT NULL DEFAULT false,
  "createdBy" int NOT NULL REFERENCES users,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NULL DEFAULT NULL,
  "removedAt" timestamptz NULL DEFAULT NULL
);

CREATE UNIQUE INDEX admin_fees_name_idx ON admin_fees ("name")
WHERE ("draftId" IS NOT NULL);

CREATE TABLE admin_fee_rules (
  "id" serial PRIMARY KEY,
  "draftId" int UNIQUE REFERENCES admin_fee_rules(id),
  "adminFeeId" int NOT NULL REFERENCES admin_fees(id),
  "countryId" char(2) NOT NULL,
  "percent" smallint NULL DEFAULT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NULL DEFAULT NULL,
  "removedAt" timestamptz NULL DEFAULT NULL
);

CREATE UNIQUE INDEX admin_fee_rules_one_per_country_idx ON admin_fee_rules ("adminFeeId", "countryId")
WHERE ("draftId" IS NOT NULL);

CREATE extension IF NOT EXISTS btree_gist;

CREATE TABLE admin_fee_affiliates (
  "id" serial PRIMARY KEY,
  "draftId" int UNIQUE REFERENCES admin_fee_affiliates(id),
  "adminFeeId" int NOT NULL REFERENCES admin_fees,
  "brandId" char(2) NOT NULL,
  "affiliateId" int NOT NULL REFERENCES affiliates,
  "period" daterange NOT NULL,
  "createdBy" int NOT NULL REFERENCES users,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NULL DEFAULT NULL,
  "removedAt" timestamptz NULL DEFAULT NULL,
  CONSTRAINT affiliate_brand_fees_overlapping_periods EXCLUDE USING gist (
    "affiliateId" WITH =,
    "brandId" WITH =,
    "period" WITH &&
  )
  WHERE ("removedAt" IS NULL AND "draftId" IS NULL)
);
