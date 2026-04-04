UPDATE punter_settings SET mfa_enabled = false WHERE punter_id IN (select punter_id from punter_personal_details WHERE is_test_account = true);
UPDATE punter_personal_details SET phone = '+79958999992' WHERE email = 'stanislav.sobolev+test@darkstormlabs.tech';
UPDATE punter_personal_details SET phone = '+79958999992' WHERE email = 'stanislav.sobolev+admin@darkstormlabs.tech';
UPDATE punter_personal_details SET phone = '+48696435162' WHERE email = 'sebastian+test@flipsports.com';
UPDATE punter_personal_details SET phone = '+48696435162' WHERE email = 'sebastian+admin@flipsports.com';
UPDATE punter_personal_details SET phone = '+4915754672804' WHERE email = 'yan.vostrikov+test@darkstormlabs.tech';
UPDATE punter_personal_details SET phone = '+4915754672804' WHERE email = 'yan.vostrikov+admin@darkstormlabs.tech';
UPDATE punter_personal_details SET phone = '+48507961949' WHERE email = 'plipski+test@virtuslab.com';
UPDATE punter_personal_details SET phone = '+48507961949' WHERE email = 'plipski+admin@virtuslab.com';