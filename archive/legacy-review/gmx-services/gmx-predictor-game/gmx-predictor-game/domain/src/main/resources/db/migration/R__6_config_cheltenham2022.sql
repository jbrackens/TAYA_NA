SET TIME ZONE 'UTC';

INSERT INTO competition (id, name)
VALUES ('CHELTENHAM2022', 'Cheltenham Festival 2022')
ON CONFLICT (id) DO UPDATE
  SET name = excluded.name;


INSERT INTO rounds (id, competition_id, number, start_time, end_time, pick_deadline)
VALUES ('ZUwzhZZGQSiuaGNrivMxnQ', 'CHELTENHAM2022', 0, '2022-03-14 15:00:00.000000', '2022-03-15 21:00:00.000000', NULL),
       ('dHbf8yZ2RYiR7hvg1MIVWQ', 'CHELTENHAM2022', 1, '2022-03-15 21:00:00.000000', '2022-03-16 21:00:00.000000', NULL),
       ('vAYoTNUiQEuyhILIyDfdYw', 'CHELTENHAM2022', 2, '2022-03-16 21:00:00.000000', '2022-03-17 21:00:00.000000', NULL),
       ('4GXwa1DlTXGcxqyrXN6ZUw', 'CHELTENHAM2022', 3, '2022-03-17 21:00:00.000000', '9999-01-01 00:00:00.000000', '2022-03-18 21:00:00.000000')

ON CONFLICT (id) DO UPDATE
  SET start_time = excluded.start_time,
    end_time = excluded.end_time,
    number = excluded.number,
    pick_deadline = excluded.pick_deadline,
    competition_id = excluded.competition_id;
