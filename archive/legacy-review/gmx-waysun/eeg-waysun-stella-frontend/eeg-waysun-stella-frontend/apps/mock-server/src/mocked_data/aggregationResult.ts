import { AggregationResultType } from "utils";

export const aggregationResultPayload: AggregationResultType = {
  "pageNumber": 1,
  "numberOfPages": 3,
  "pageSize": 3,
  "results": [
    {
      "position": 1,
      "groupByFieldValue": "Ronaldo123",
      "min": 12,
      "max": 100,
      "count": 360,
      "sum": 5436.09,
      "custom": "",
      "createdAt": "2021-01-23T01:23:45.678+09:00",
      "updatedAt": "2021-01-23T01:34:40.112+09:00"
    },
    {
      "position": 2,
      "groupByFieldValue": "Stefan_111",
      "min": 1,
      "max": 99,
      "count": 360,
      "sum": 1236.1,
      "custom": "",
      "createdAt": "2021-01-23T01:23:45.678+09:00",
      "updatedAt": "2021-01-23T01:34:40.112+09:00"
    },
    {
      "position": 3,
      "groupByFieldValue": "Feeboo_N4c1",
      "min": 77,
      "max": 97,
      "count": 360,
      "sum": 936.54,
      "custom": "",
      "createdAt": "2021-01-23T01:23:45.678+09:00",
      "updatedAt": "2021-01-23T01:34:40.112+09:00"
    },
  ]
}