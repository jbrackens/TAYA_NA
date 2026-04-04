CREATE TABLE IF NOT EXISTS notes (
    note_id UUID PRIMARY KEY,
    owner_id character varying NOT NULL,
    created_at timestamptz NOT NULL,
    text character varying NOT NULL,
    note_type character varying NOT NULL,
    author_id character varying NULL
);
