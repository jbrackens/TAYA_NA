-- COMPETITION
CREATE TABLE competition (
  id   VARCHAR(22)  NOT NULL,
  name VARCHAR(256) NOT NULL,
  CONSTRAINT pk_competition PRIMARY KEY (id)
);


-- INIT OBJECT FOR REFERENCES (UPDATED IN REPEATABLE SQL)
INSERT INTO competition
VALUES ('_Xw05P6MQv2ShC8qNCTXBw', 'INIT');


-- LINK TO LEADERBOARD
ALTER TABLE leaderboard
  ADD COLUMN competition_id VARCHAR(22);

UPDATE leaderboard
SET competition_id = '_Xw05P6MQv2ShC8qNCTXBw';

ALTER TABLE leaderboard
  ALTER COLUMN competition_id SET NOT NULL;

ALTER TABLE leaderboard
  ADD CONSTRAINT fk_leaderboard_competition_id FOREIGN KEY (competition_id) REFERENCES competition (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_leaderboard_competition_id
  ON leaderboard (competition_id);

-- CLEANUP LEADERBOARD
ALTER TABLE leaderboard_entry
  RENAME CONSTRAINT fk_leaderboard_entrys_user_id TO fk_leaderboard_entry_user_id;

ALTER TABLE leaderboard
  DROP COLUMN season;


-- LINK TO ROUND
ALTER TABLE rounds
  ADD COLUMN competition_id VARCHAR(22);

UPDATE rounds
SET competition_id = '_Xw05P6MQv2ShC8qNCTXBw';

ALTER TABLE rounds
  ALTER COLUMN competition_id SET NOT NULL;

ALTER TABLE rounds
  ADD CONSTRAINT fk_rounds_competition_id FOREIGN KEY (competition_id) REFERENCES competition (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_rounds_competition_id
  ON rounds (competition_id);

ALTER TABLE rounds
  DROP CONSTRAINT uq_rounds_number;

ALTER TABLE rounds
  ADD CONSTRAINT uq_rounds_competition_id_number UNIQUE (competition_id, number);
