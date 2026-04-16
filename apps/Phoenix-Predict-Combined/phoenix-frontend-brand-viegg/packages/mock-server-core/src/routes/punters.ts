import { Router } from "express";
import punters from "../controllers/puntersController";

export default () => {
  const api = Router();

  // post /punters/selfExclude
  api.post("/selfExclude", punters.selfExclude);

  // delete /punter
  api.delete("/", punters.deleteAccount);
  api.post("/selfExclude", punters.selfExclude);

  // post /punters/limits/deposit
  api.post("/limits/deposit", punters.postLimits);

  // post /punters/limits/session
  api.post("/limits/session", punters.postLimits);

  // post /punters/limits/loss
  api.post("/limits/loss", punters.postLimits);

  // get /punters/wallet/balance
  api.get("/wallet/balance", punters.getBalance);

  // get /punters/bets
  api.get("/bets", punters.getBets);

  // post /punters/bets
  api.post("/bets", punters.postBets);

  // GET /punters/limits-history
  api.get("/limits-history", punters.limitsHistory);

  return api;
};
