CREATE TABLE punter_personal_details (
    punter_id character varying NOT NULL PRIMARY KEY,
    username character varying NOT NULL UNIQUE,
    name_title character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL UNIQUE,
    phone character varying NOT NULL,
    address_line character varying NOT NULL,
    city character varying NOT NULL,
    state character varying NOT NULL,
    zipcode character varying NOT NULL,
    country character varying NOT NULL,
    date_of_birth date NOT NULL,
    gender character varying NULL
);