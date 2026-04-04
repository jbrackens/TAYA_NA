import { Router } from "express";
import achievementController from "../controllers/achievementController";

export default () => {
  const api = Router();

  // GET HOSTNAME/rule_configurator/achievements
  api.get("/rule_configurator/achievements", achievementController.getAchievementsConfiguration);

  // POST HOSTNAME/rule_configurator/achievements
  api.post("/rule_configurator/achievements", achievementController.postAchievementConfiguration);

  // GET HOSTNAME/rule_configurator/achievements/:id
  api.get("/rule_configurator/achievements/:id", achievementController.getAchievementConfigurationById);

  // PATCH HOSTNAME/rule_configurator/achievements/:id
  api.patch("/rule_configurator/achievements/:id", achievementController.patchAchievementConfiguration);

  // DELETE HOSTNAME/rule_configurator/achievements/:id
  api.delete("/rule_configurator/achievements/:id", achievementController.deleteAchievementConfiguration);

  // GET HOSTNAME/achievements/:id/windows
  api.get("/achievements/:id/windows", achievementController.getAchievementWindows);

  // GET HOSTNAME/achievements/:id
  api.get("/achievements/:id", achievementController.getAchievements);

  return api;
};
