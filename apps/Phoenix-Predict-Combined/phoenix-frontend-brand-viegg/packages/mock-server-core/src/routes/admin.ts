import { Router } from "express";
import AdminPunters from "../controllers/admin/punterController";
import AdminMarkets from "../controllers/admin/marketController";
import AdminFixtures from "../controllers/admin/fixtureController";
import AdminLogs from "../controllers/admin/logsController";
import errorsController from "../controllers/errorsController";
import Terms from "../controllers/admin/terms";

export default () => {
  const api = Router();

  // GET /punters
  api.get("/punters", AdminPunters.list);

  // GET /punters/:id
  api.get("/punters/:id", AdminPunters.details);

  // GET /punters/:id/bets
  // api.get("/punters/:id/bets", AdminPunters.bets);
  api.get("/punters/:id/bets", AdminPunters.winAndLoss);

  // POST /punters/:id/bets
  api.post("/punters/:id/bets", AdminPunters.placeBet);

  // GET /punters/:id/transactions
  api.get("/punters/:id/transactions", AdminPunters.transactions);

  // GET /punters/:id/recent-activities
  api.get("/punters/:id/recent-activities", AdminPunters.recentActivities);

  // GET /punters/:id/logs
  api.get("/punters/:id/logs", AdminPunters.auditLogs);

  // GET /punters/:id/session-history
  api.get("/punters/:id/session-history", AdminPunters.sessionHistory);

  // GET /punters/:id/notes
  api.get("/punters/:id/notes", AdminPunters.notes);

  // GET /punters/:id/detail/ssn
  api.get("/punters/:id/detail/ssn", AdminPunters.fullSsn);

  // PUT /punters/:id/limits/:action
  api.put("/punters/:id/limits/:action", AdminPunters.updateLimits);

  // POST /punters/:id/limits/:action
  api.post("/punters/:id/lifecycle/:action", AdminPunters.updateLifecycle);

  // PUT /punters/:id/limits/:action
  api.put("/punters/:id/lifecycle/:action", AdminPunters.updateLifecycle);

  // GET /trading/markets
  api.get("/trading/markets", AdminMarkets.list);

  // GET /trading/markets/:id
  api.get("/trading/markets/:id", AdminMarkets.details);

  // POST /trading/markets/:id
  api.post("/trading/markets/:id", AdminMarkets.update);

  // PUT /trading/markets/:id/result
  api.put("/trading/markets/:id/result", AdminMarkets.updateResult);

  // POST /trading/markets/:id/lifecycle/:action
  api.post(
    "/trading/markets/:id/lifecycle/:action",
    AdminMarkets.performAction,
  );

  // GET /trading/fixtures
  api.get("/trading/fixtures", AdminFixtures.list);

  // GET /trading/fixtures/:id
  api.get("/trading/fixtures/:id", AdminFixtures.details);

  // POST /trading/fixtures/:id
  api.post("/trading/fixtures/:id", AdminFixtures.update);

  // POST /trading/fixtures/:id/lifecycle/:action
  api.post(
    "/trading/fixtures/:id/lifecycle/:action",
    AdminFixtures.performAction,
  );

  // GET /logs
  api.get("/logs", AdminLogs.list);

  // POST /terms-and-conditions
  api.post("/upload-terms", Terms.termsAndConditions);

  // GET /punters/:id/limits-history
  api.get("/punters/:id/limits-history", AdminPunters.limitsHistory);

  return api;
};
