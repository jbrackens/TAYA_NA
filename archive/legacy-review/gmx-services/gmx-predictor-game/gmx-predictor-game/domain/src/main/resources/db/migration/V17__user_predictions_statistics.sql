-- TOTAL SELECTIONS AND CORRECT SELECTIONS
ALTER TABLE user_predictions
  ADD COLUMN total_selections INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE user_predictions
  ADD COLUMN correct_selections INTEGER DEFAULT 0 NOT NULL;

-- UPDATE ROUND LEADERBOARD
UPDATE user_predictions
SET total_selections=picks.picks_submitted,
    correct_selections=picks.picks_correct
FROM (SELECT up.id,
             max(up.score)                                           score,
             count(up.id) FILTER (WHERE ep.selection IS NOT NULL) AS picks_submitted,
             count(up.id) FILTER (WHERE ep.score > 0)             AS picks_correct
      FROM user_predictions AS up
             JOIN event_predictions ep ON up.id = ep.prediction_id
      GROUP BY up.id
     ) AS picks
WHERE user_predictions.id = picks.id;
