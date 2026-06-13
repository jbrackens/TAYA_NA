import {
  walletResponse,
  betsResponse,
  postBetsResponse,
  limitsHistoryData,
} from "../mocked_data/punters";

export default {
  async selfExclude(req: any, res: any) {
    return res.status(200).send({});
  },

  async deleteAccount(req: any, res: any) {
    return res.status(200).send({});
  },

  async postLimits(req: any, res: any) {
    const { daily, weekly, monthly } = req.body;

    if (!daily || !weekly || !monthly) {
      return res.status(400).send({ message: `malformed data` });
    }
    return res.status(200).send({
      daily,
      weekly,
      monthly,
    });
  },

  async getBalance(req: any, res: any) {
    return res.status(200).send(walletResponse);
  },

  async getBets(req: any, res: any) {
    return res.status(200).send(betsResponse);
  },

  async postBets(req: any, res: any) {
    return res.status(202).send(
      req.body.map((el: any) => ({
        ...postBetsResponse,
        marketId: el.marketId,
        selectionId: el.selectionId,
      })),
    );
  },

  async limitsHistory(req: any, res: any) {
    return res.status(200).send(limitsHistoryData);
  },
};
