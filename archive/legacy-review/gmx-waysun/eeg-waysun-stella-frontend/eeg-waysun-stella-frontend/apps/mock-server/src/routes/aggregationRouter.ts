import { Router } from "express";
import AggregationController from "../controllers/aggregationController";

export default () => {
  const api = Router();

  // GET HOSTNAME/rule_configurator/aggregations
  api.get("/", AggregationController.getAggregation);

  // POST HOSTNAME/rule_configurator/aggregations
  api.post("/", AggregationController.postAggregation);

  // GET HOSTNAME/rule_configurator/aggregations/:id
  api.get("/:id", AggregationController.getAggregationById);

  // PATCH HOSTNAME/rule_configurator/aggregations/:id
  api.patch("/:id", AggregationController.patchAggregation);

  // DELETE HOSTNAME/rule_configurator/:id
  api.delete("/:id", AggregationController.deleteAggregation);

  return api;
};
