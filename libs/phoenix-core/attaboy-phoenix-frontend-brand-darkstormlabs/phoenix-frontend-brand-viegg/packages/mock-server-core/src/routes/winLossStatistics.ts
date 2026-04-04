import { Router } from "express";
import WinLossStatistics from "../controllers/winLossStatisticsController";

export default () => {
  const api = Router();

  // get /win-loss-statistics
  api.get("/", WinLossStatistics.getWinAndLossStatistics);

  return api;
};
