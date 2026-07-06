UPDATE reporting_punters as rp
    SET punter_name = concat(ppd.name_title, ' ', ppd.first_name, ' ', ppd.last_name)
    FROM punter_personal_details as ppd
    WHERE rp.punter_id = ppd.punter_id;