import { winAndLossStatistics } from "../mocked_data/win-loss-statistics";

const url = require("url");

export default {
  async getWinAndLossStatistics(req: any, res: any) {
    const urlQueries = url.parse(req.url, true).query;
    const { type, range } = urlQueries;
    const filteredByType = type
      ? winAndLossStatistics.filter((el: any) => el.betResult === type)
      : winAndLossStatistics;
    const filteredByRange = filteredByType;
    const filteredByPage =
      urlQueries["pagination.currentPage"] !== 2
        ? filteredByRange.slice(0, 9)
        : filteredByRange.slice(9, 15);
    return res.status(200).send({
      currentPage: urlQueries["pagination.currentPage"] != 2 ? 1 : 2,
      data: filteredByPage,
      hasNextPage: true,
      itemsPerPage: 10,
      totalCount: winAndLossStatistics.length,
    });
  },
};
