alter table payment_provider_countries drop column active;
alter table payment_provider_currencies drop column active;
alter table payment_providers add column "blockCountries" boolean not null default true;

INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('INR', 'CJ', false);

INSERT INTO countries VALUES ('CA', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IN', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('TR', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('JP', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('ID', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('BR', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('AT', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('BE', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CY', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CZ', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CH', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('FR', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('GR', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IR', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IT', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('NL', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('PT', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('RO', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('SK', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('SI', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('ES', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('GB', 'LD', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;

INSERT INTO countries VALUES ('CA', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IN', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('TR', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('JP', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('ID', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('BR', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('AT', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('BE', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CY', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CZ', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('CH', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('FR', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('GR', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IR', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('IT', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('NL', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('PT', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('RO', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('SK', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('SI', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('ES', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;
INSERT INTO countries VALUES ('GB', 'CJ', 18, true, true, false, 'low', NULL) ON CONFLICT DO NOTHING;

-- Interac
UPDATE payment_providers SET "blockCountries" = false WHERE id IN (26, 27);
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 26, 'CA') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 27, 'CA') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 26, 'CAD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 27, 'CAD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 26, 'CA') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 27, 'CA') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 26, 'CAD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 27, 'CAD') ON CONFLICT DO NOTHING;

-- QPay
UPDATE payment_providers SET "blockCountries" = false WHERE id = 32;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 32, 'IN') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 32, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 32, 'IN') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 32, 'INR') ON CONFLICT DO NOTHING;

-- CreditCard_Bambora
UPDATE payment_providers SET "blockCountries" = false WHERE id = 18;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 18, 'BR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 18, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 18, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 18, 'GBP') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'BR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 18, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 18, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 18, 'GBP') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 18, 'BR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 18, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 18, 'EUR') ON CONFLICT DO NOTHING;

-- CreditCard_Worldpay
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 5, 'BR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 5, 'USD') ON CONFLICT DO NOTHING;

-- CreditCard_EMP
UPDATE payment_providers SET "blockCountries" = false WHERE id = 16;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 16, 'BR') ON CONFLICT DO NOTHING;

-- VisaVoucher_Kluwp
UPDATE payment_providers SET "blockCountries" = false WHERE id = 24;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 24, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 24, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 24, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 24, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 24, 'BR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 24, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 24, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 24, 'INR') ON CONFLICT DO NOTHING;

-- MasterCard_EMP
UPDATE payment_providers SET "blockCountries" = false WHERE id = 17;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 17, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 17, 'TR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 17, 'JP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 17, 'ID') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 17, 'BR') ON CONFLICT DO NOTHING;

-- MuchBetter
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 30, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 30, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 30, 'CAD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 30, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 30, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 30, 'CAD') ON CONFLICT DO NOTHING;

-- EUTELLER
UPDATE payment_providers SET "blockCountries" = false WHERE id IN (22, 23);
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 22, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 23, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 22, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 23, 'EUR') ON CONFLICT DO NOTHING;

-- ENTERCASH used for tests
UPDATE payment_providers SET "blockCountries" = false WHERE id IN (1);
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 1, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 1, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 1, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 1, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 1, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 1, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 1, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 1, 'EUR') ON CONFLICT DO NOTHING;


-- EUTELLER
UPDATE payment_providers SET "blockCountries" = false WHERE id IN (22, 23);
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 22, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 23, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 22, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 23, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 22, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 23, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 22, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 23, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('KK', 22, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('KK', 23, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 22, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 23, 'EUR') ON CONFLICT DO NOTHING;


-- Zimpler
UPDATE payment_providers SET "blockCountries" = false WHERE id = 7;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 7, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 7, 'SE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 7, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 7, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 7, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 7, 'SE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 7, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 7, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('KK', 7, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 7, 'EUR') ON CONFLICT DO NOTHING;

-- PaySafe_Worldpay
UPDATE payment_providers SET "blockCountries" = false WHERE id = 9;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'BE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'CY') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'CZ') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'CH') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'FR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'GR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'IR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'IT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'PT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'RO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'SK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'SI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'SE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'ES') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 9, 'GB') ON CONFLICT DO NOTHING;

-- SOFOT_SKRILL
UPDATE payment_providers SET "blockCountries" = false WHERE id = 31;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 31, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 31, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 31, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 31, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 31, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 31, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 31, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 31, 'EUR') ON CONFLICT DO NOTHING;

-- SKRILL_SKRILL
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 4, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 4, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 4, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 4, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 4, 'EUR') ON CONFLICT DO NOTHING;


-- BankTransfer_Trustly
UPDATE payment_providers SET "blockCountries" = false WHERE id = 29;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 29, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 29, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 29, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 29, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('KK', 29, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 29, 'EUR') ON CONFLICT DO NOTHING;

-- Trustly_Trustly
UPDATE payment_providers SET "blockCountries" = false WHERE id = 20;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 20, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 20, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 20, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 20, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 20, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 20, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 20, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 20, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 20, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 20, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('KK', 20, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 20, 'EUR') ON CONFLICT DO NOTHING;

-- Jeton
UPDATE payment_providers SET "blockCountries" = true WHERE id in (33, 34);
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 33, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 34, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 33, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 34, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 33, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 33, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 34, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 34, 'EUR') ON CONFLICT DO NOTHING;

-- Neteller_Neteller
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 3, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 3, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 3, 'NO') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'SEK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 3, 'EUR') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 3, 'EUR') ON CONFLICT DO NOTHING;


-- RapidTransfer_Skrill
UPDATE payment_providers SET "blockCountries" = false WHERE id = 28;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 28, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 28, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 28, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 28, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 28, 'EE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 28, 'EUR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 28, 'DE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 28, 'AT') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 28, 'NL') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 28, 'EE') ON CONFLICT DO NOTHING;


-- SiruMobile_SiruMobile
UPDATE payment_providers SET "blockCountries" = false WHERE id = 10;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 10, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('LD', 10, 'SE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 10, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 10, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 10, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 10, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 10, 'CAD') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 10, 'FI') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_countries ("brandId", "paymentProviderId", "countryId") VALUES ('CJ', 10, 'SE') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 10, 'INR') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 10, 'USD') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 10, 'NOK') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 10, 'GBP') ON CONFLICT DO NOTHING;
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('CJ', 10, 'CAD') ON CONFLICT DO NOTHING;

INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('KK', 10, 'EUR') ON CONFLICT DO NOTHING;


UPDATE payment_providers SET "blockCountries" = true WHERE id IN (25);
INSERT INTO payment_provider_currencies ("brandId", "paymentProviderId", "currencyId") VALUES ('LD', 25, 'EUR') ON CONFLICT DO NOTHING;
