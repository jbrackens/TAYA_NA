import { fixtures } from "../mocked_data/fixture";

export default {
  async getFixtures(req: any, res: any) {
    setTimeout(() => {
      return res.status(200).send(fixtures);
    }, 1500);
  },
};
