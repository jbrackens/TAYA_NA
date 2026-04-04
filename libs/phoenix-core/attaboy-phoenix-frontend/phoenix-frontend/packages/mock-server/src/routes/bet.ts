import { Router } from "express";
import Bet from "../controllers/betController";

export default () => {
  const api = Router();

  // POST /pool-bet/bet
  api.post("/bet", Bet.placeABet);

  return api;
};
