create type user_role_type as enum('administrator', 'riskManager', 'payments', 'agent');

create table risk_types (
  "type" varchar(20) PRIMARY key,
  "title" varchar(100) not null,
  "maxPoints" int,
  "share" int
);

insert into risk_types values
  ('customer', 'Customer risk', 100, 35),
  ('transaction', 'Transaction risk', 100, 15),
  ('interface', 'Interface risk', 100, 35),
  ('geo', 'Geographical risk', 100, 35);

CREATE TABLE risks (
  "id" serial PRIMARY key,
  "riskProfiles" player_risk_profile[],
  "manualCheck" boolean not null default true,
  "type" varchar(20) references risk_types,
  "fraudKey" varchar(40) null,
  "points" INT NOT NULL DEFAULT 0,
  "maxCumulativePoints" INT NOT NULL DEFAULT 0,
  "requiredRole" user_role_type not null default 'agent',
  "active" boolean not null default true,
  "title" text,
  "description" text,
  UNIQUE("fraudKey")
);

INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('geo', 'registration_ip_country_mismatch', 10, 10, 'Registration IP and country does not match', 'Please check player history and adjust Risk Profile if needed.', '{"low"}');
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('geo', 'login_ip_country_mismatch', 10, 10, 'Login IP and registration country does not match', 'Please check player history and adjust Risk Profile if needed.', '{"low"}');
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('geo', 'login_vpn', 10, 10, 'Login from VPN or TOR', 'Please check player history and adjust Risk Profile if needed.', '{"low"}');
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'invalid_email_address', 20, 20, 'Invalid or undelivarable e-mail address', 'E-mail can''t be delivered to given email address', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'politically_exposed_person', 0, 0, 'Player selected Politically Exposed Person (PEP) status', 'Risk Profile changed to High and player needs to be verified: Request for confirmation of PEP status via e-mail (#PEP-request)', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'other_source_of_wealth', 20, 20, 'Player checked unspecified source of wealth', 'Please check the explanation.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'altering_deposit_method', 20, 20, 'Player deposited while money originating from different payment method on account', 'Please check if the transaction was ok and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'several_payment_accounts', 20, 20, 'Player has three or more payment accounts under same payment method', 'Please check if the transaction was ok and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'balance_on_account', 20, 20, 'Player has at least €1000 on account, but made deposit with different payment method', 'Please check if the transaction was ok and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'huge_deposit', 20, 20, 'Player single deposit amount over risk threshold', 'Check player details and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'cumulative_deposits_over_amount', 20, 20, 'Player deposits in last 30 days over country risk threshold', 'Check player details and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'cumulative_deposits_2x_nodoc', 20, 20, 'Player deposits in last 30 days over double country risk threshold and no source of wealth document received', 'Ask player for proof of Source of Wealth and change risk profile to High until player sends the proof.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'cumulative_deposits_2x', 20, 20, 'Player deposits in last 30 days over double country risk threshold and source of wealth document received', 'Check the deposit amounts and make sure player’s deposits are within reasonable limits of source of wealth proving document. If they deposit amounts are significantly higher than the document suggests, change risk profile to high for ongoing monitoring.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'due_diligence_required', 50, 50, 'Player deposit was blocked because deposits in last 180 over 2000€ and Due Diligence required', 'Request for KYC/verification. Transactions are blocked until player completes Due Diligence.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'registration_phone_number', 20, 20, 'Tried to registered with same phone number as already existing player', 'Check if duplicate account or fake details.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'same_browser_registrations', 10, 10, 'Multiple registrations with same browser', 'Check if duplicate account or fake details.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'payment_method_country', 40, 40, 'Payment method country and player country does not match', 'Check player details and decide if Risk Profile should be adjusted.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'payment_method_owner', 40, 40, 'Payment method owner and registered player name mismatch', 'Check player details and decide if Risk Profile should be adjusted or transactions blocked if 3rd party deposit.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'payment_method_email', 40, 40, 'Payment method owner email address and registered player email mismatch', 'Check player details and decide if Risk Profile should be adjusted or transactions blocked if 3rd party deposit.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'payment_method_phone', 40, 40, 'Payment method owner phone number and registered player phone number mismatch', 'Check player details and decide if Risk Profile should be adjusted or transactions blocked if 3rd party deposit.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'successive_high_risk_deposits', 40, 40, 'Successive deposits with high risk payment method', 'Check deposit pattern and gameplay. If any suspicious activity, mark as high risk and initiate EDD process.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'sudden_big_deposit', 40, 40, 'Deposit amount considerable larger than previous deposit average', 'Check deposit pattern. If any suspicious activity, mark as high risk and initiate EDD process.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'login_blocked', 5, 5, 'Too many invalid logins, logins blocked', 'Check player activity history and ask player if help is needed.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'failed_deposit', 50, 50, 'Complete / pending deposit failed - possible cashback', 'Already processed deposit failed. Check payment history, bonuses, wagerings. Game play and transactions disabled.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('interface', 'failed_withdrawal', 0, 0, 'Complete withdrawal failed - need to be resolved manually', 'Withdrawal marked as complete failed. Needs to be resolved manually.', null);
INSERT INTO risks ("type", "fraudKey", "points", "maxCumulativePoints", "title", "description", "riskProfiles") VALUES ('customer', 'pep_questionnaire', 0, 0, 'Pep check C6', 'Do customer risk assessment and check player on C6 ', null);
ALTER TABLE player_frauds ADD CONSTRAINT "fraudKey_risk_levels_fkey" FOREIGN key ("fraudKey") REFERENCES risks("fraudKey");
ALTER TABLE player_frauds add COLUMN "createdBy" INT REFERENCES users;
ALTER TABLE player_events add column "fraudId" int references player_frauds;
UPDATE player_events SET "fraudId"=(details->>'fraudId')::INT WHERE details->'fraudId' IS NOT null;
