alter table rewards add column validity int null;

alter table ledgers add column expires timestamptz null;
