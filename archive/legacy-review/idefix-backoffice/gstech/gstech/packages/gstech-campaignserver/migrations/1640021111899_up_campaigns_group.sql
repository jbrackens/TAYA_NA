create table campaign_groups (
  "id" serial primary key,
  "name" varchar(255) not null
);

alter table campaigns add column "groupId" int null references campaign_groups;

insert into campaign_groups (name) select name from campaigns where campaigns."groupId" is null;
update campaigns set "groupId" = campaign_groups.id from campaign_groups where campaigns.name = campaign_groups.name;