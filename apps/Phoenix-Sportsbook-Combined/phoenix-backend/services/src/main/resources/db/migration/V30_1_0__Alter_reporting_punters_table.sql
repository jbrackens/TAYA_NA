ALTER TABLE reporting_punters 
ADD COLUMN punter_name varchar;

UPDATE reporting_punters SET punter_name = '';

ALTER TABLE reporting_punters 
ALTER COLUMN punter_name SET NOT NULL;