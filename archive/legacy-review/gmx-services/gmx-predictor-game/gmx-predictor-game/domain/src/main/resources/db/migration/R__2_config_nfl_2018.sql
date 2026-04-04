SET TIME ZONE 'UTC';

INSERT INTO competition (id, name)
VALUES ('NFL2018', 'NFL Season 2018/2019')
ON CONFLICT (id) DO UPDATE
  SET name = excluded.name;


INSERT INTO rounds (id, competition_id, number, start_time, end_time, pick_deadline)
VALUES ('J33JLNrIShe2JL0N_Cv41w', 'NFL2018', 1, '2018-09-04 04:00:00.000000', '2018-09-11 04:00:00.000000', NULL),
       ('Fy40wM-xScy0qFLx1pQMvg', 'NFL2018', 2, '2018-09-11 04:00:00.000000', '2018-09-18 04:00:00.000000', '2018-09-16 17:00:00.000000'),
       ('QW-rtS6DS2C9CwdyS7cc1w', 'NFL2018', 3, '2018-09-18 04:00:00.000000', '2018-09-25 04:00:00.000000', '2018-09-23 17:00:00.000000'),
       ('xtyyQgv_SGWlNnzwlGZuLg', 'NFL2018', 4, '2018-09-25 04:00:00.000000', '2018-10-02 04:00:00.000000', '2018-09-30 17:00:00.000000'),
       ('ohV0F4EjTYaoQ5OZdy_iHQ', 'NFL2018', 5, '2018-10-02 04:00:00.000000', '2018-10-09 04:00:00.000000', '2018-10-07 17:00:00.000000'),
       ('DvO2uSZnSMC_4GKl9iZ5pg', 'NFL2018', 6, '2018-10-09 04:00:00.000000', '2018-10-16 04:00:00.000000', '2018-10-14 17:00:00.000000'),
       ('1G1iL8uYS6ee00ocMLpEXw', 'NFL2018', 7, '2018-10-16 04:00:00.000000', '2018-10-23 04:00:00.000000', '2018-10-21 17:00:00.000000'),
       ('4HpHfcAQQXG9RdY8NOt5wQ', 'NFL2018', 8, '2018-10-23 04:00:00.000000', '2018-10-30 04:00:00.000000', '2018-10-28 17:00:00.000000'),
       ('S-wDUZ5dSWOb-2Ica5jOEw', 'NFL2018', 9, '2018-10-30 04:00:00.000000', '2018-11-06 04:00:00.000000', '2018-11-04 17:00:00.000000'),
       ('3YGODocWTPWrCPlTjUxIog', 'NFL2018', 10, '2018-11-06 04:00:00.000000', '2018-11-13 04:00:00.000000', '2018-11-11 18:00:00.000000'),
       ('FreN6EOWSluz1oEKXFdOPA', 'NFL2018', 11, '2018-11-13 04:00:00.000000', '2018-11-20 04:00:00.000000', '2018-11-18 18:00:00.000000'),
       ('T-1sZt2-QRyCtlmyaPr8KA', 'NFL2018', 12, '2018-11-20 04:00:00.000000', '2018-11-27 04:00:00.000000', '2018-11-25 18:00:00.000000'),
       ('UnLfrs2HRBy4tMEXVkjIZQ', 'NFL2018', 13, '2018-11-27 04:00:00.000000', '2018-12-04 04:00:00.000000', '2018-12-02 18:00:00.000000'),
       ('0X7mhNDsSq6918dg2VQV7w', 'NFL2018', 14, '2018-12-04 04:00:00.000000', '2018-12-11 04:00:00.000000', '2018-12-09 18:00:00.000000'),
       ('eMcjI6h_Q0KyqRTA5Kz9MA', 'NFL2018', 15, '2018-12-11 04:00:00.000000', '2018-12-18 04:00:00.000000', '2018-12-16 18:00:00.000000'),
       ('IeJkktruTpqEzhV_EcPZ8Q', 'NFL2018', 16, '2018-12-18 04:00:00.000000', '2018-12-25 04:00:00.000000', '2018-12-23 18:00:00.000000'),
       ('zKX99cz4TqyBMSmzz4M20Q', 'NFL2018', 17, '2018-12-25 04:00:00.000000', '9999-01-01 00:00:00.000000', '2018-12-30 18:00:00.000000')
ON CONFLICT (id) DO UPDATE
  SET start_time = excluded.start_time,
    end_time = excluded.end_time,
    pick_deadline = excluded.pick_deadline,
    competition_id = excluded.competition_id;


INSERT INTO leaderboard (id, competition_id, round_id)
VALUES ('fzwToiJVSGmI3h5OtDeShQ', 'NFL2018', NULL),
       ('ronmzTw9SceRGm1_soc8yQ', 'NFL2018', 'J33JLNrIShe2JL0N_Cv41w'),
       ('q6n2fGBYSFSd2FQ1zuEhcg', 'NFL2018', 'Fy40wM-xScy0qFLx1pQMvg'),
       ('N5RWARg-TtKNlDgdy2jERA', 'NFL2018', 'QW-rtS6DS2C9CwdyS7cc1w'),
       ('lgbsqZHkQWS6pUkFnNprqw', 'NFL2018', 'xtyyQgv_SGWlNnzwlGZuLg'),
       ('WuI8WG1YRp6TEEizwCa6hw', 'NFL2018', 'ohV0F4EjTYaoQ5OZdy_iHQ'),
       ('urnjf6X4Q2G2u_Fb-g4gkg', 'NFL2018', 'DvO2uSZnSMC_4GKl9iZ5pg'),
       ('1rDnY18jT8GE-nW4jd4-Kg', 'NFL2018', '1G1iL8uYS6ee00ocMLpEXw'),
       ('wHcjaOu4Ql2vD9SXK5kAcA', 'NFL2018', '4HpHfcAQQXG9RdY8NOt5wQ'),
       ('3b-9KlPyQ1yAY5vUrwqgGw', 'NFL2018', 'S-wDUZ5dSWOb-2Ica5jOEw'),
       ('2e_POrZZSr2QEjvbZx1vWA', 'NFL2018', '3YGODocWTPWrCPlTjUxIog'),
       ('8l1yMHzHRkqNLRgesyvZ3w', 'NFL2018', 'FreN6EOWSluz1oEKXFdOPA'),
       ('r43deA74QQe8TQ22kwZMog', 'NFL2018', 'T-1sZt2-QRyCtlmyaPr8KA'),
       ('I02uJhuMSyiNGt0wo5yiCQ', 'NFL2018', 'UnLfrs2HRBy4tMEXVkjIZQ'),
       ('l_3yws42RRKu6Ft_8mOcxQ', 'NFL2018', '0X7mhNDsSq6918dg2VQV7w'),
       ('OcfgmPLITwSUDK4dzEjKhw', 'NFL2018', 'eMcjI6h_Q0KyqRTA5Kz9MA'),
       ('LvfLwfJJQ7yELOGr5rhdXw', 'NFL2018', 'IeJkktruTpqEzhV_EcPZ8Q'),
       ('8pu4phgWQb-5XPpbfVguRg', 'NFL2018', 'zKX99cz4TqyBMSmzz4M20Q')
ON CONFLICT (id) DO UPDATE
  SET competition_id = excluded.competition_id,
    round_id = excluded.round_id;