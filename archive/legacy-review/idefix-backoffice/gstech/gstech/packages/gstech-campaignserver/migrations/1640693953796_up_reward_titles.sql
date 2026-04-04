update reward_rules set titles = jsonb_set(titles::jsonb, '{en}', jsonb_build_object('text', titles -> 'en'))::json where titles -> 'en' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{no}', jsonb_build_object('text', titles -> 'no'))::json where titles -> 'no' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{es}', jsonb_build_object('text', titles -> 'es'))::json where titles -> 'es' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{fi}', jsonb_build_object('text', titles -> 'fi'))::json where titles -> 'fi' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{de}', jsonb_build_object('text', titles -> 'de'))::json where titles -> 'de' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{fr}', jsonb_build_object('text', titles -> 'fr'))::json where titles -> 'fr' is not null;
update reward_rules set titles = jsonb_set(titles::jsonb, '{sv}', jsonb_build_object('text', titles -> 'sv'))::json where titles -> 'sv' is not null;