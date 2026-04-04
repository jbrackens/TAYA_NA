CREATE TABLE invoices (
  "id" SERIAL PRIMARY KEY,

  "invoiceNumber" varchar(255) NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT FALSE,

  "createdBy" INT NOT NULL REFERENCES users,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

ALTER TABLE payments ADD COLUMN "invoiceId" INT NULL REFERENCES invoices;
