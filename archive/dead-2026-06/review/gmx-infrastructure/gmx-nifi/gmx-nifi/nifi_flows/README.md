# Nifi Flows

## Variables

Global variables to set

- `API_ENDPOINT` - RMX/GMX endpoint i.e. https://api.rmx.com
-

### OIDC client data

- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_PASSWORD`

### `GET_OR_CREATE_EXT_USER`

- `OIDC_USER_GET_OR_CREATE_EXT_USER`
- `OIDC_PASS_GET_OR_CREATE_EXT_USER`

### `EXT_TOP_UP_USER`

- `OIDC_USER_EXT_TOP_UP_USER`
- `OIDC_PASS_EXT_TOP_UP_USER`

### Redis related

- `REDIS_HOST` - _default_ `localhost`
- `REDIS_PORT` - _default_ `6379`
- `REDIS_DATABASE` - _default_ `0`

### Kafka related

- `KAFKA_HOST`
- `KAFKA_PORT`
- `KAFKA_GROUP_ID_SUFIX` Kafka consumer group id. Each ENV must have different
   group, and must be the same within CLUSTER, i.e. `preprod_1`
- `KAFKA.TOPIC.CUSTOMER_DETAILS` must be set to proper topic i.e. `customerdetails`
- `KAFKA.TOPIC.CASINO_BETS` must be set to proper topic i.e. `casinobets`
- `KAFKA.TOPIC.SPORT_BETS` must be set to proper topic i.e. `sportbets`


## Global services to set

- `RedisConnectionPoolService`

With connection string set to `${REDIS_HOST}:${REDIS_PORT}`

- `RedisdistributedMapCacheClientService_4_HOURS`

with TTL set to `4 hours`

- `RedisdistributedMapCacheClientService_1_HOUR`

with TTL set to `1 hour`

- `RedisdistributedMapCacheClientService_4_MINUTES`

with TTL set to `4 minutes`

- `DistributedMapCacheLookupService`

with choosen `RedisdistributedMapCacheClientService_4_MINUTES` as service


``` json
    {
        "title": "Single Bets Settlement Reward",
        "amount": "25.00000000",
        "company_id": "9577609b-d14f-4f14-ae6d-a6de017e8254",
        "created_date": "2019-03-03 23:59:59",
        "external_user_id": "17894621",
        "operation_subtype": "STD",
        "ignore_on_duplicate": true,
        "external_transaction_id": "bonus-weekenddp-17894621-single-2019-03-03T23:59:59+00"
    }
```
