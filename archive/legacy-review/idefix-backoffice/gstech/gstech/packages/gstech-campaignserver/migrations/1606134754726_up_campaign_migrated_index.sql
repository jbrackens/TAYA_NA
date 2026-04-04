create unique index "campaigns_name_brandId_migrated_key"
    on campaigns ("name", "brandId") where migrated = true;