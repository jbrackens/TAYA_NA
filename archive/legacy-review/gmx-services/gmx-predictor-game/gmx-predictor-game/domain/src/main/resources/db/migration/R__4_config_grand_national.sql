SET TIME ZONE 'UTC';

INSERT INTO competition (id, name)
VALUES ('GRAND_NATIONAL2019', 'Aintree Grand National 2019')
ON CONFLICT (id) DO UPDATE
  SET name = excluded.name;


INSERT INTO rounds (id, competition_id, number, start_time, end_time, pick_deadline)
VALUES ('P2rK6vBQSaySAA4ZYJFVwA', 'GRAND_NATIONAL2019', 0, '2019-01-01 01:00:00.000000', '2019-04-04 17:00:00.000000', NULL),
       ('VqjJIdnpSCudnlneUzpItQ', 'GRAND_NATIONAL2019', 1, '2019-04-04 17:00:00.000000', '2019-04-05 17:00:00.000000', NULL),
       ('zwEcD431SC63VWlYGvg5Sg', 'GRAND_NATIONAL2019', 2, '2019-04-05 17:00:00.000000', '9999-01-01 00:00:00.000000', '2019-04-06 17:00:00.000000')
ON CONFLICT (id) DO UPDATE
  SET start_time = excluded.start_time,
    end_time = excluded.end_time,
    number = excluded.number,
    pick_deadline = excluded.pick_deadline,
    competition_id = excluded.competition_id;
