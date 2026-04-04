create table thumbnails (
  "id" serial primary key,
  "brandId" varchar(2) not null,
  "key" varchar(255) not null,
  "blurhashes" json null,
  "viewModes" varchar(255)[] not null default '{}',

  unique("brandId", "key")
);

alter table games rename column thumbnail to "thumbnailId";
alter table games alter column "thumbnailId" drop not null;
alter table games alter column "thumbnailId" type int using null;
alter table games add constraint "games_thumbnailId_fkey" foreign key ("thumbnailId") references thumbnails (id);
