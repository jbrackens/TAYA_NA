create index "player_email_idx" on players(lower("email"));
create index "player_lastLogin_idx" on players("lastLogin");
create index "player_brandId_idx" on players("brandId");

create index "player_unique_details_key" on players("brandId", replace(lower("firstName"), ' ', ''), replace(lower("lastName"), ' ', ''), replace(lower("address"), ' ', ''), replace(lower("postCode"), ' ', '')) where "accountClosed" = false;

create index "players_fulltext_idx" on players using gin (("firstName" || ' ' || "lastName") gin_trgm_ops);
create index "players_tags_gin_idx" on players using gist("tags");
create index "players_address_fulltext_idx" on players using gin ("address" gin_trgm_ops);

create index "payments_playerId_idx" on payments("playerId");
create index "payments_accountId_idx" on payments("accountId");
create index "payments_paymentType_idx" on payments("paymentType");
create index "payments_status_idx" on payments("status");
create index "payments_transactionId_idx" on payments("transactionId");

create index "payment_event_paymentId_key" on payment_event_logs("paymentId");

create index "player_bonuses_playerId_idx" on player_bonuses("playerId");
create index "player_bonuses_bonusId_idx" on player_bonuses("bonusId");

create index "sessions_playerId_idx" on sessions("playerId");
CREATE index "sessions_endReason_idx" ON sessions("endReason", "playerId") WHERE "endReason" is null;

create index "manufacturer_sessions_manufacturerId_sessionId_idx" on manufacturer_sessions("manufacturerId", "sessionId");
create index "manufacturer_sessions_manufacturerId_manufacturerSessionId_idx" on manufacturer_sessions("manufacturerId", "manufacturerSessionId");

CREATE index "kyc_documents_playerId_idx" ON kyc_documents("playerId");
CREATE index "kyc_documents_status_idx" ON kyc_documents("status");
CREATE index "payment_event_logs_paymentId_idx" ON payment_event_logs("paymentId");
