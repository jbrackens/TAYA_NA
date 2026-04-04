alter table content_type
    add column location varchar(255) not null default '';

alter table content_type
    drop constraint "content_type_type_brandId_key";
create unique index "content_type_type_brandId_location_key"
    on content_type (type, "brandId", location);