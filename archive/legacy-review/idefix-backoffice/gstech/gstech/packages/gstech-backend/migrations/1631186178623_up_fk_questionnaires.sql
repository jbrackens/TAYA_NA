insert into questionnaires ("id", "brandId", "name", "description", "active") values (32, 'FK', 'PEP', 'AML: Politically Exposed Person', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (32, 'pep', 'Politically exposed person', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (33, 'FK', 'SOW', 'AML: Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (33, 'source_of_wealth', 'Source of Wealth', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (33, 'explanation', 'Additional explanation', false);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (34, 'FK', 'Transfer', 'MGA: Transfer to Esports license', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (34, 'license_transfer', 'Accept transfer', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (35, 'FK', 'Total_Deposits_5k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (35, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (36, 'FK', 'Total_Deposits_10k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (36, 'ltd', 'Satisfied with deposit amount', true);

insert into questionnaires ("id", "brandId", "name", "description", "active") values (37, 'FK', 'Total_Deposits_15k', 'Deposit amount satisfaction', true);
insert into questionnaire_questions ("questionnaireId", "key", "description", "required") values (37, 'ltd', 'Satisfied with deposit amount', true);