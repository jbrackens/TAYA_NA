CREATE TABLE responsibility_check_tasks (
    id UUID NOT NULL PRIMARY KEY,
    wallet_id character varying NOT NULL,
    scheduled_for timestamptz NOT NULL
);

CREATE INDEX "index_scheduledFor" ON responsibility_check_tasks USING btree (scheduled_for);
