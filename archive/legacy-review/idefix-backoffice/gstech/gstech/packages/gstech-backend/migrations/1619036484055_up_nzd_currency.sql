insert into base_currencies ("id", "symbol", "defaultConversion") values ('NZD', '$', 1);
INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('NZD', 'LD', false);
INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('NZD', 'CJ', false);

insert into conversion_rate_histories ("currencyId", "conversionRate") values ('NZD', 1);
refresh materialized view conversion_rates;
refresh materialized view monthly_conversion_rates;
