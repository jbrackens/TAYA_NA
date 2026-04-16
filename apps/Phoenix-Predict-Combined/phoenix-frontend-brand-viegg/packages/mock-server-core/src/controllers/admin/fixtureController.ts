import { isNaN, isEmpty, orderBy, find, get, first } from "lodash";
import qs from "qs";
import { ParsedQuery, ParsedQueryPagination } from "../../types/crud";
import { fixtures } from "../../mocked_data/markets-fixtures";
import { bypassRequest } from "../../utils/crud";
import {
  parsePagination,
  DEFAULT_PAGINATION,
  resolvePagination,
} from "../../utils/crud";

export default {
  async list(req: any, res: any) {
    const i = req.url.indexOf("?");
    const query = req.url.substr(i + 1);
    const parsedQuery = qs.parse(query, { allowDots: true });
    const { sorting, pagination }: ParsedQuery = parsedQuery as ParsedQuery;

    if (!isEmpty(sorting) || !isEmpty(pagination)) {
      const parsedPagination = parsePagination(
        pagination as ParsedQueryPagination,
      );
      const { sorting }: ParsedQuery = parsedQuery;
      return res.status(200).send({
        data: resolvePagination(
          orderBy(fixtures, [get(sorting, "field")], [get(sorting, "order")]),
          parsedPagination,
        ),
        totalCount: fixtures.length,
        ...parsedPagination,
      });
    }

    return res.status(200).send({
      data: resolvePagination(fixtures),
      totalCount: fixtures.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async details(req: any, res: any) {
    const { params, query } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10) || id;

    if (!parsedId) {
      return res.status(404).send();
    }

    const basic = find(fixtures, (item) => item.fixtureId === parsedId);

    return res.status(200).send({
      ...basic,
    });
  },

  async update(req: any, res: any) {
    return bypassRequest(req, res);
  },

  async updateResult(req: any, res: any) {
    return bypassRequest(req, res);
  },

  async performAction(req: any, res: any) {
    return bypassRequest(req, res);
  },
};
