import { Router } from "express";
import currencyController from "../controllers/currencyController";

export default () => {
  const api = Router();

  // GET HOSTNAME/rule_configurator/events
  api.get("/", currencyController.getCurrency);

  // // GET HOSTNAME/rule_configurator/events/:id
  api.get("/:id", currencyController.getCurrencyById);

  return api;
};
