ALTER TABLE punter_cool_offs
    ADD COLUMN cool_off_cause character varying;

-- This is a placeholder value, no particular reason for choosing this one over SESSION_LIMIT_BREACH
UPDATE punter_cool_offs SET cool_off_cause = 'SELF_INITIATED';

ALTER TABLE punter_cool_offs
    ALTER COLUMN cool_off_cause SET NOT NULL;
