create type deposit_drafts_status as enum ('initialized', 'confirmed');
alter table deposit_drafts add column "status" deposit_drafts_status not null default 'initialized';
