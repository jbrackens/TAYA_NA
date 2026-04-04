-- users unique by sub
ALTER TABLE users
  ADD CONSTRAINT uq_users_oidc_sub UNIQUE (oidc_sub);

-- users unique by account + partner
ALTER TABLE users
  ADD CONSTRAINT uq_users_external_id_partner_id UNIQUE (external_id, partner_id);

-- rounds unique by number
ALTER TABLE rounds
  ADD CONSTRAINT uq_rounds_number UNIQUE (number);

-- user_predictions unique by user + round
ALTER TABLE user_predictions
  ADD CONSTRAINT uq_user_predictions_user_id_round_id UNIQUE (user_id, round_id);

-- event_predictions unique by prediction + event
ALTER TABLE event_predictions
  ADD CONSTRAINT uq_event_predictions_prediction_id_event_id UNIQUE (prediction_id, event_id);
