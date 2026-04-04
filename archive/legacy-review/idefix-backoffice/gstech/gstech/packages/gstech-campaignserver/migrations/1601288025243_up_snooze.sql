alter table subscription_options add column "snoozeSmsesUntil" timestamptz null;
alter table subscription_options add column "snoozeEmailsUntil" timestamptz null;
