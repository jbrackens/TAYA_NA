CREATE index "player_counters_type_idx" ON player_counters(type) WHERE active=true;
CREATE index "player_counters_paymentId" ON player_counters("paymentId") WHERE "paymentId" IS NOT null;

