alter table user_events add column "createdBy" int null references users;
