insert into content_type (id, type, "brandId") values (2005, 'localization', 'KK') on conflict do nothing;
insert into content_type (id, type, "brandId") values (2006, 'localization', 'CJ') on conflict do nothing;
insert into content_type (id, type, "brandId") values (2007, 'localization', 'LD') on conflict do nothing;
insert into content_type (id, type, "brandId") values (2008, 'localization', 'OS') on conflict do nothing;

alter table content alter column content set data type jsonb using content::jsonb;
create index content_brands_idx on content using gin ((content -> 'brands'));