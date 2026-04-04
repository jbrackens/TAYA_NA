CREATE TABLE leaderboard (
  id       VARCHAR(22) NOT NULL,
  season   INTEGER     NOT NULL,
  round_id VARCHAR(22),
  CONSTRAINT pk_leaderboard PRIMARY KEY (id)
);

CREATE TABLE leaderboard_entry (
  id             VARCHAR(22) NOT NULL,
  leaderboard_id VARCHAR(22) NOT NULL,
  user_id        VARCHAR(22) NOT NULL,
  score          INTEGER NOT NULL,
  position       INTEGER,
  CONSTRAINT pk_leaderboard_entry PRIMARY KEY (id)
);


ALTER TABLE leaderboard
  ADD CONSTRAINT fk_leaderboard_round_id FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_leaderboard_round_id
  ON leaderboard (round_id);


ALTER TABLE leaderboard_entry
  ADD CONSTRAINT fk_leaderboard_entry_leaderboard_id FOREIGN KEY (leaderboard_id) REFERENCES leaderboard (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_leaderboard_entry_leaderboard_id
  ON leaderboard_entry (leaderboard_id);


ALTER TABLE leaderboard_entry
  ADD CONSTRAINT fk_leaderboard_entrys_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_leaderboard_entry_user_id
  ON leaderboard_entry (user_id);


ALTER TABLE leaderboard_entry
  ADD CONSTRAINT uq_leaderboard_entry_leaderboard_id_user_id UNIQUE (leaderboard_id, user_id);
