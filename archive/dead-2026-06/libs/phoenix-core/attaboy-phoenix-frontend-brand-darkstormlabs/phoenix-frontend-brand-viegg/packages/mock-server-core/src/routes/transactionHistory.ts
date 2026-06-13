import { Router } from "express";
import TransactionsHistory from "../controllers/transactionHistoryController";

export default () => {
  const api = Router();

  // get /games
  api.get("/", TransactionsHistory.getTransactions);

  return api;
};
