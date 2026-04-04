import { EventGetResponseType, EventPostResponseType } from "utils";
import { eventResponse, postEventResponse } from "../mocked_data/event";

export default {
  async getEvents(req: any, res: any) {
    const response: EventGetResponseType
      = { status: "ok", details: [eventResponse] }
    return res.status(200).send(response);
  },

  async postEvent(req: any, res: any) {
    const response: EventPostResponseType
      = { status: "ok", details: postEventResponse }
    return res.status(200).send(response);
  },

  async getEventById(req: any, res: any) {
    const response: EventPostResponseType
      = { status: "ok", details: eventResponse }
    return res.status(200).send(response);
  },

  async patchEvent(req: any, res: any) {
    const response: EventPostResponseType
      = { status: "ok", details: eventResponse }
    return res.status(200).send(response);
  },

  async deleteEvent(req: any, res: any) {
    return res.status(200).send();
  },
}
