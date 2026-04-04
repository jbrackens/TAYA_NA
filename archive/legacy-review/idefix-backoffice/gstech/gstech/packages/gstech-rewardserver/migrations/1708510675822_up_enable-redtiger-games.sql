UPDATE games
SET active = TRUE
FROM thumbnails
WHERE games."thumbnailId" = thumbnails.id
AND manufacturer = 'Evolution'
AND active = FALSE
AND key LIKE 'REDTIGER%';
