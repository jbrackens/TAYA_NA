CREATE index "payment_event_logs_status_idx" ON payment_event_logs(status);
CREATE index "payment_event_logs_status_userId_idx" ON payment_event_logs(status) WHERE "userId" IS NOT null;
CREATE index "payment_event_logs_timestamp_idx" ON payment_event_logs("timestamp" desc);
