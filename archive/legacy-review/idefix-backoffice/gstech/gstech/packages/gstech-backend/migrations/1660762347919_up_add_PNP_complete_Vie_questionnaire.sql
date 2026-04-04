insert into questionnaires ("id", "brandId", "name", "description", "active") values (48, 'VB', 'PNP_Complete', 'Complete player registration', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (48, 'pnp_complete_email', 'Email', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (48, 'pnp_complete_phone', 'Phone', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (48, 'pnp_complete_promo', 'Allow promotions', true);