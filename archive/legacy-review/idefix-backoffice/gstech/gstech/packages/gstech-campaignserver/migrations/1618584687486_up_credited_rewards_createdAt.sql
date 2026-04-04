alter table credited_rewards add column "createdAt" timestamptz not null default now();
