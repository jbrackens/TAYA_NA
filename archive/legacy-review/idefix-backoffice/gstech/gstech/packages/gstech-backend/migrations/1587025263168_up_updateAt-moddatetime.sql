DROP TRIGGER IF EXISTS players_updated ON players;
DROP TRIGGER IF EXISTS player_segments_updated ON player_segments;
DROP TRIGGER IF EXISTS payments_updated ON payments;

DROP FUNCTION IF EXISTS trigger_set_updated();

-- create a better trigger
CREATE EXTENSION moddatetime;

CREATE TRIGGER players_updated BEFORE UPDATE ON players FOR EACH ROW EXECUTE PROCEDURE moddatetime("updatedAt");
CREATE TRIGGER player_segments_updated BEFORE UPDATE ON player_segments FOR EACH ROW EXECUTE PROCEDURE moddatetime("updatedAt");
CREATE TRIGGER payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE moddatetime("updatedAt");
