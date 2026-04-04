import {
  AchievementGetResponseType,
  AchievementPostResponseType,
  AchievementResponseType,
  AchievementWindowsResponseType
} from "utils";
import {
  achievementConfigurationPayload,
  achievementsPayload,
  achievementWindowPayload
} from "../mocked_data/achievement";

export default {
  async getAchievementsConfiguration(req: any, res: any) {
    const response: AchievementGetResponseType
      = { status: "ok", details: [achievementConfigurationPayload] }
    return res.status(200).send(response);
  },

  async postAchievementConfiguration(req: any, res: any) {
    const response: AchievementPostResponseType
      = { status: "ok", details: achievementConfigurationPayload }
    return res.status(200).send(response);
  },

  async getAchievementConfigurationById(req: any, res: any) {
    const response: AchievementPostResponseType
      = { status: "ok", details: achievementConfigurationPayload }
    return res.status(200).send(response);
  },

  async patchAchievementConfiguration(req: any, res: any) {
    const response: AchievementPostResponseType
      = { status: "ok", details: achievementConfigurationPayload }
    return res.status(200).send(response);
  },

  async deleteAchievementConfiguration(req: any, res: any) {
    return res.status(200).send();
  },

  async getAchievementWindows(req: any, res: any) {
    const response: AchievementWindowsResponseType
      = { status: "ok", results: [achievementWindowPayload] }
    return res.status(200).send(response);
  },

  async getAchievements(req: any, res: any) {
    const response: AchievementResponseType
      = { status: "ok", results: achievementsPayload }
    return res.status(200).send(response);
  },
}
