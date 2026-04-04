CREATE TABLE IF NOT EXISTS terms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_terms_version TEXT NOT NULL UNIQUE,
    terms_content TEXT NOT NULL,
    terms_days_threshold INTEGER NOT NULL DEFAULT 365 CHECK (terms_days_threshold > 0),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_terms_documents_created_at
    ON terms_documents (created_at DESC);
