INSERT INTO base_currencies ("id", "symbol", "defaultConversion") VALUES ('BRL', 'R$', 5);
INSERT INTO conversion_rate_histories ("currencyId", "conversionRate") VALUES ('BRL', 5);

INSERT INTO base_currencies ("id", "symbol", "defaultConversion") VALUES ('CLP', '$', 800);
INSERT INTO conversion_rate_histories ("currencyId", "conversionRate") VALUES ('CLP', 800);

INSERT INTO base_currencies ("id", "symbol", "defaultConversion") VALUES ('PEN', 'S/', 4);
INSERT INTO conversion_rate_histories ("currencyId", "conversionRate") VALUES ('PEN', 4);


refresh materialized view conversion_rates;
refresh materialized view monthly_conversion_rates;

INSERT INTO currencies ("brandId", "id") VALUES ('LD', 'BRL');
INSERT INTO currencies ("brandId", "id") VALUES ('CJ', 'BRL');
INSERT INTO currencies ("brandId", "id") VALUES ('SN', 'BRL');
INSERT INTO currencies ("brandId", "id") VALUES ('VB', 'BRL');

INSERT INTO currencies ("brandId", "id") VALUES ('LD', 'CLP');
INSERT INTO currencies ("brandId", "id") VALUES ('CJ', 'CLP');
INSERT INTO currencies ("brandId", "id") VALUES ('SN', 'CLP');
INSERT INTO currencies ("brandId", "id") VALUES ('VB', 'CLP');

INSERT INTO currencies ("brandId", "id") VALUES ('LD', 'PEN');
INSERT INTO currencies ("brandId", "id") VALUES ('CJ', 'PEN');
INSERT INTO currencies ("brandId", "id") VALUES ('SN', 'PEN');
INSERT INTO currencies ("brandId", "id") VALUES ('VB', 'PEN');