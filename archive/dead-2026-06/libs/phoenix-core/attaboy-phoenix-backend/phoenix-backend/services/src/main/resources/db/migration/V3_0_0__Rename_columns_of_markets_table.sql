
ALTER TABLE markets RENAME COLUMN attributes TO specifiers;

ALTER TABLE markets RENAME COLUMN transitions TO status_history;
