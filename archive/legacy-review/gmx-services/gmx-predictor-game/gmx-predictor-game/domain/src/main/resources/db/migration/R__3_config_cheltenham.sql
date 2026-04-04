SET TIME ZONE 'UTC';

INSERT INTO competition (id, name)
VALUES ('CHELTENHAM2019', 'Cheltenham Festival 2019')
ON CONFLICT (id) DO UPDATE
  SET name = excluded.name;


INSERT INTO rounds (id, competition_id, number, start_time, end_time, pick_deadline)
VALUES ('HnXocvnCQiOWKFr2p4H7cQ', 'CHELTENHAM2019', 0, '2019-03-11 12:00:00.000000', '2019-03-12 18:00:00.000000', NULL),
       ('bwmqpQYYRiqDXp0kdopHgQ', 'CHELTENHAM2019', 1, '2019-03-12 18:00:00.000000', '2019-03-13 18:00:00.000000', NULL),
       ('-zVCB1D1RcyikVzjhfzO_g', 'CHELTENHAM2019', 2, '2019-03-13 18:00:00.000000', '2019-03-14 18:00:00.000000', NULL),
       ('RPb4gC9SRReqHBMdLDgbvg', 'CHELTENHAM2019', 3, '2019-03-14 18:00:00.000000', '9999-01-01 00:00:00.000000', '2019-03-16 00:00:00.000000')

ON CONFLICT (id) DO UPDATE
  SET start_time = excluded.start_time,
    end_time = excluded.end_time,
    number = excluded.number,
    pick_deadline = excluded.pick_deadline,
    competition_id = excluded.competition_id;
