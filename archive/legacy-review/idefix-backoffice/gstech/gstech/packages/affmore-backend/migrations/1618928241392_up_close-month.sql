CREATE TABLE closed_months (
  "id" SERIAL PRIMARY KEY,

  "month" smallint null,
  "year" smallint null,

  "createdBy" INT NOT NULL REFERENCES users,
  "createdAt" TIMESTAMPTZ NOT NULL,
  unique ("month", "year")
);
