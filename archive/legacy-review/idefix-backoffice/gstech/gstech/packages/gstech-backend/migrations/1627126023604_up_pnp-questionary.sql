insert into questionnaires ("id", "brandId", "name", "description", "active") values (25, 'FK', 'PNP_Complete', 'Complete player registration', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (25, 'pnp_complete_email', 'Email', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (25, 'pnp_complete_phone', 'Phone', true);
