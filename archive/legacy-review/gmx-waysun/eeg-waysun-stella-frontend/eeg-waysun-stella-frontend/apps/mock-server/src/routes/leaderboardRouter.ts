import { Router } from "express";
import leaderboardController from "../controllers/leaderboardController";

export default () => {
  const api = Router();

  // GET https://HOSTNAME/leaderboard/aggregations/$rule_id/windows
  api.get("/:id/windows", leaderboardController.getAggregationsWindows);

  // GET https://HOSTNAME/leaderboard/aggregations/$rule_id
  api.get("/:id", leaderboardController.getByRuleId);

  // GET https://HOSTNAME/leaderboard/aggregations/$rule_id/neighbors
  api.get("/:id/neighbors", leaderboardController.getByRuleId);

  //GET https://HOSTNAME/leaderboard/aggregations/$rule_id/compare
  api.get("/:id/compare", leaderboardController.getCompare);

  return api;
};
