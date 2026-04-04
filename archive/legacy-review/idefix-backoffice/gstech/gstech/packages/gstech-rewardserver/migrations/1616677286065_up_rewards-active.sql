alter table rewards
    add column active boolean not null default true;

update rewards
set active = false
where metadata ->> 'tags' like '%disabled%';