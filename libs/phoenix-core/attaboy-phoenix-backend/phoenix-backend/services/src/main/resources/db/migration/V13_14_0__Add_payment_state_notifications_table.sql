CREATE TABLE payment_state_notifications (
    transaction_id character varying NOT NULL,
    payment_id character varying NOT NULL,
    state_definition character varying NOT NULL,
    punter_id character varying NOT NULL,
    transaction_amount decimal NOT NULL,
    payment_method character varying NOT NULL,
    creation_type character varying NOT NULL,
    processing_status character varying NOT NULL,
    processing_details character varying NULL,

    PRIMARY KEY(transaction_id, payment_id, state_definition)
);