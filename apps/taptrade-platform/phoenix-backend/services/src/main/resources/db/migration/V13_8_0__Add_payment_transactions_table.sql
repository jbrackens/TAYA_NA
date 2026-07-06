CREATE TABLE payment_transactions
(
    punter_id         character varying NOT NULL,
    transaction_id    character varying NOT NULL,
    payment_direction character varying NOT NULL,
    amount            decimal           NOT NULL,
    status            character varying NOT NULL,
    PRIMARY KEY (punter_id, transaction_id)
);
