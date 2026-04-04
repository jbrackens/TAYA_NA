import { Router } from "express";
import eventController from "../controllers/eventController";

export default () => {
  const api = Router();

  // GET HOSTNAME/rule_configurator/events
  api.get("/", eventController.getEvents);

  // POST HOSTNAME/rule_configurator/events
  api.post("/", eventController.postEvent);

  // // GET HOSTNAME/rule_configurator/events/:id
  api.get("/:id", eventController.getEventById);

  // // PATCH HOSTNAME/rule_configurator/events/:id
  api.patch("/:id", eventController.patchEvent);

  // // DELETE HOSTNAME/rule_configurator/:id
  api.delete("/:id", eventController.deleteEvent);

  return api;
};
