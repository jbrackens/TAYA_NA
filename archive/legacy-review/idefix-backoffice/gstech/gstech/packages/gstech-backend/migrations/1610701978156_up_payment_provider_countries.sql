create table payment_provider_limits
(
    "id"                 serial primary key,
    "brandId"            char(2)        not null references brands,
    "paymentProviderId"  int            not null references payment_providers,
    "currencyId"         char(3)        not null,
    "minDeposit"         numeric(12, 0) not null,
    "maxDeposit"         numeric(12, 0) not null,
    "minWithdrawal"      numeric(12, 0) not null,
    "maxWithdrawal"      numeric(12, 0) not null,
    "maxPendingDeposits" numeric(12, 0) null,
    foreign key ("brandId", "currencyId") references currencies ("brandId", "id"),
    unique ("brandId", "paymentProviderId", "currencyId")
);

insert into payment_provider_limits ("brandId", "currencyId", "minDeposit", "maxDeposit", "minWithdrawal",
                                     "maxWithdrawal", "maxPendingDeposits", "paymentProviderId")
select pml."brandId",
       pml."currencyId",
       pml."minDeposit",
       pml."maxDeposit",
       pml."minWithdrawal",
       pml."maxWithdrawal",
       pml."maxPendingDeposits",
       pp.id
from payment_providers pp
         inner join payment_methods pm on pm.id = pp."paymentMethodId"
         left join payment_method_limits pml on pm.id = pml."paymentMethodId"
where pml."brandId" is not null;

CREATE TABLE payment_provider_countries
(
    "id"                serial PRIMARY key,
    "brandId"           char(2) not null references brands,
    "paymentProviderId" int     not null references payment_providers,
    "countryId"         char(2) not null,
    "active"            boolean not null default true,
    foreign key ("brandId", "countryId") references countries ("brandId", "id"),
    unique ("brandId", "paymentProviderId", "countryId")
);

CREATE TABLE payment_provider_currencies
(
    "id"                serial PRIMARY key,
    "brandId"           char(2) not null references brands,
    "paymentProviderId" int     not null references payment_providers,
    "currencyId"        char(3) not null references base_currencies,
    "active"            boolean not null default true,
    foreign key ("brandId", "currencyId") references currencies ("brandId", "id"),
    unique ("brandId", "paymentProviderId", "currencyId")
);