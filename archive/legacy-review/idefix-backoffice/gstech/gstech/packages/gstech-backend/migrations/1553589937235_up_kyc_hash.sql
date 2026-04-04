alter table kyc_documents add column "hash" varchar(32);
alter table kyc_documents add column "source" varchar(32);
CREATE UNIQUE index "kyc_documents_hash_key" ON kyc_documents("playerId", "source", "hash") WHERE hash IS NOT NULL AND content IS NOT NULL AND source is not null;
