This JSON is currently is **not** processed automatically in any way,
this is to be done within the scope of [PHXD-3044](https://eegtech.atlassian.net/browse/PHXD-3044).
It's just here to easily restore the alerting rule if needed.

Text representation of the condition:

```
WHEN THE count OF LOG ENTRIES

WITH level IS ERROR

IS more than or equals 1
FOR THE LAST 5 minutes
GROUP BY logger_name
```
