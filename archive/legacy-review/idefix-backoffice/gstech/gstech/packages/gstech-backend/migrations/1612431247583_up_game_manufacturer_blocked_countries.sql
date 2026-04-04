create table game_manufacturer_blocked_countries
(
    "gameManufacturerId" char(3) not null references game_manufacturers,
    "countryId"          char(2) not null references base_countries,
    primary key ("gameManufacturerId", "countryId")
);