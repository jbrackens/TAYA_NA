import { AggregationGetResponseType, AggregationPostResponseType } from "utils";
import { AggregationGETPayload } from "../mocked_data/aggregation";

export default {
  async getAggregation(req: any, res: any) {
    const response: AggregationGetResponseType
      = { status: "ok", details: [AggregationGETPayload] }
    return res.status(200).send(response);
  },

  async postAggregation(req: any, res: any) {
    const response: AggregationPostResponseType
      = { status: "ok", details: AggregationGETPayload }
    return res.status(200).send(response);
  },

  async getAggregationById(req: any, res: any) {
    const response: AggregationPostResponseType
      = { status: "ok", details: AggregationGETPayload }
    return res.status(200).send(response);
  },

  async patchAggregation(req: any, res: any) {
    const response: AggregationPostResponseType
      = { status: "ok", details: AggregationGETPayload }
    return res.status(200).send(response);
  },

  async deleteAggregation(req: any, res: any) {
    return res.status(200).send();
  },
}
