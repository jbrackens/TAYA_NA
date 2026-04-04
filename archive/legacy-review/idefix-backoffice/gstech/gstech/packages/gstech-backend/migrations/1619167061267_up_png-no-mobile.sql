UPDATE games SET archived = TRUE WHERE "manufacturerId" = 'PNG' AND "mobileGame";
UPDATE games SET "mobileGame" = TRUE WHERE "manufacturerId" = 'PNG' AND archived = FALSE;
