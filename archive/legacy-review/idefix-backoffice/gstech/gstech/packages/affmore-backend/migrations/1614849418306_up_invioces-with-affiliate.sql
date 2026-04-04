alter table invoices add column "affiliateId" int null references affiliates;

update invoices
set "affiliateId" = payments."affiliateId"
from payments
where payments."invoiceId" = invoices.id;

alter table invoices alter column "affiliateId" set not null;
