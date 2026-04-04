import { AchievementWindowsResponseType, AggregationResultNeighborResponseType, AggregationResultResponseType, EventGetResponseType, EventPostResponseType } from "utils";
import { achievementWindowPayload } from "../mocked_data/achievement";
import { aggregationResultPayload } from "../mocked_data/aggregationResult";

export default {
  async getAggregationsWindows(req: any, res: any) {
    const response: AchievementWindowsResponseType
      = { status: "ok", results: [achievementWindowPayload] }
    return res.status(200).send(response);
  },

  async getByRuleId(req: any, res: any) {
    const response: AggregationResultResponseType
      = { status: "ok", results: aggregationResultPayload }
    return res.status(200).send(response);
  },

  async getNeighbors(req: any, res: any) {
    const response: AggregationResultNeighborResponseType
      = { status: "ok", results: [aggregationResultPayload] }
    return res.status(200).send(response);
  },

  async getCompare(req: any, res: any) {
    const response: AggregationResultNeighborResponseType
      = { status: "ok", results: [aggregationResultPayload] }
    return res.status(200).send(response);
  },
}
