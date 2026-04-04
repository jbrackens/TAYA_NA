UPDATE
    "Customers"
SET
    "IsSMSOptIn" = NULL,
    "IsEmailOptIn" = NULL,
    "LastUpdated" = now()
WHERE
    "LastUpdated" <= '2022-06-03 12:01:01'
