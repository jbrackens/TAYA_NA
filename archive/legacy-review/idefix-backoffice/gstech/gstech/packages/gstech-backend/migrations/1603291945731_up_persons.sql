create table persons (
    "id" serial PRIMARY key
);

ALTER TABLE players ADD COLUMN "personId" int null references persons;