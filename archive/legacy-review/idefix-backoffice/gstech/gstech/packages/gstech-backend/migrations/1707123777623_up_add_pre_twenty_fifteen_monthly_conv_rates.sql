DROP materialized VIEW monthly_conversion_rates;

CREATE materialized VIEW monthly_conversion_rates AS
SELECT DISTINCT ON (months.month, currencies.id) months.month,
  currencies.id AS "currencyId",
  coalesce(
    legacy_conversion_rates."conversionRate",
    previous_conversion_rates."conversionRate",
    current_conversion_rates."conversionRate"
  ) AS "conversionRate"
FROM (
    SELECT generate_series(
        date_trunc(
          'month',
          '2014-01-01 00:00:00' AT TIME zone 'Europe/Rome'
        ),
        date_trunc('month', NOW() + '1 year'::INTERVAL),
        INTERVAL '1 month'
      ) AS "month"
  ) months
  JOIN currencies ON 1 = 1
  LEFT OUTER JOIN (
    /* New way is to use monthly mean average */
    SELECT "currencyId",
      date_trunc('month', timestamp) AS MONTH,
      percentile_disc(0.5) WITHIN group (
        ORDER BY "conversionRate"
      ) AS "conversionRate"
    FROM conversion_rate_histories
    GROUP BY date_trunc('month', timestamp),
      "currencyId"
    ORDER BY "currencyId",
      "month" DESC
  ) previous_conversion_rates ON previous_conversion_rates."currencyId" = currencies.id
  AND previous_conversion_rates.month <= months.month
  LEFT OUTER JOIN (
    /* Before 2018-06-01 monthly average was used as value */
    SELECT "currencyId",
      date_trunc('month', timestamp) AS MONTH,
      ROUND(avg("conversionRate"), 5) AS "conversionRate"
    FROM conversion_rate_histories
    GROUP BY date_trunc('month', timestamp),
      "currencyId"
    ORDER BY "currencyId",
      "month" DESC
  ) legacy_conversion_rates ON legacy_conversion_rates."currencyId" = currencies.id
  AND legacy_conversion_rates.month <= months.month
  AND months.month < '2018-06-01'
  JOIN (
    /* Use latest value for months without data */
    SELECT DISTINCT ON ("currencyId") "currencyId",
      "conversionRate"
    FROM conversion_rate_histories
    ORDER BY "currencyId",
      "timestamp" DESC
  ) current_conversion_rates ON current_conversion_rates."currencyId" = currencies.id
ORDER BY months.month DESC,
  currencies.id,
  legacy_conversion_rates.month DESC,
  previous_conversion_rates.month DESC