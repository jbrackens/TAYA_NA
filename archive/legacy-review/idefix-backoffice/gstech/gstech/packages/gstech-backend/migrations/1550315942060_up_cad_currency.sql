insert into base_currencies ("id", "symbol", "defaultConversion") values ('CAD', '$', 1);
INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('CAD', 'LD', false);
INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('CAD', 'CJ', false);

insert into conversion_rate_histories ("currencyId", "conversionRate") values ('CAD', 1);
refresh materialized view conversion_rates;
refresh materialized view monthly_conversion_rates;
