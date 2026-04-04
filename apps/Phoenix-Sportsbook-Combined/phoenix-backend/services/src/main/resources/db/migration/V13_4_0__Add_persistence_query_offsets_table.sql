CREATE TABLE persistence_query_offsets
(
    key  character varying NOT NULL PRIMARY KEY,
    current_offset int8 NOT NULL
);