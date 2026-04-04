create table events (
  "id" serial primary key,
  "campaignsContentId" int not null references campaigns_content,

  "text" varchar(255) not null,
  "timestamp" timestamptz not null
);
