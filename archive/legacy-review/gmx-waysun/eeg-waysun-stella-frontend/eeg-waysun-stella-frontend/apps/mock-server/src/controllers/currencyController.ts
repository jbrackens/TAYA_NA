import { currencyResponse } from "../mocked_data/currency";

export default {
  async getCurrency(req: any, res: any) {
    const response = { status: "ok", details: [currencyResponse] };
    return res.status(200).send(response);
  },

  async getCurrencyById(req: any, res: any) {
    const response = { status: "ok", details: currencyResponse };
    return res.status(200).send(response);
  },
};
