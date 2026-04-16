import { games, fixture } from "../mocked_data/games";

export default {
  async getGames(req: any, res: any) {
    return res.status(200).send(games);
  },

  async getFixture(req: any, res: any) {
    return res.status(200).send(fixture);
  },
};
