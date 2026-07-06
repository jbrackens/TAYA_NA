import { transactions } from "../mocked_data/transaction-history";

const url = require("url");

export default {
  async getTransactions(req: any, res: any) {
    const urlQueries = url.parse(req.url, true).query;
    const { category, range } = urlQueries;
    const filteredByType = category
      ? transactions.filter((el) => el.category === category)
      : transactions;
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
      totalCount: filteredByRange.length,
    });
  },
};
