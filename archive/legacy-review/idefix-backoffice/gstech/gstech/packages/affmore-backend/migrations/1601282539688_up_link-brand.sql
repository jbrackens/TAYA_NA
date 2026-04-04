alter table links add column "brandId" char(2) default 'LD';
update links set "brandId"='KK' where "landingPage" like '%kalevalakasino.com%';
update links set "brandId"='OS' where "landingPage" like '%olaspill.com%';
update links set "brandId"='CJ' where "landingPage" like '%casinojefe.com%';
alter table links alter column "brandId" drop default;