ALTER TABLE player_limits ADD constraint "periodType_null_for_timeout" check ("type" <> 'timeout' or "periodType" is null);
ALTER TABLE player_limits ADD constraint "limitValue_null_for_timeout" check ("type" <> 'timeout' or "limitValue" is null);
