import { isNaN, isEmpty, orderBy, get } from "lodash";
import qs from "qs";
import {
  list,
  recentActivities,
  details,
  unverifiedProfileDetails,
  notes,
} from "../../mocked_data/users";
import { betsHistory } from "../../mocked_data/bets-history";
import { ParsedQuery, ParsedQueryPagination } from "../../types/crud";
import { bypassRequest } from "../../utils/crud";
import { transactions } from "../../mocked_data/transaction-history";
import { winAndLossStatistics } from "../../mocked_data/win-loss-statistics";
import {
  parsePagination,
  DEFAULT_PAGINATION,
  resolvePagination,
} from "../../utils/crud";
import { auditLogs } from "../../mocked_data/audit-logs";
import { sessionHistory } from "../../mocked_data/session-history";
import { adminLimitsHistory } from "../../mocked_data/admin-limits-history";

export default {
  async list(req: any, res: any) {
    const i = req.url.indexOf("?");
    const query = req.url.substr(i + 1);
    const parsedQuery = qs.parse(query, { allowDots: true });
    const { sorting, pagination, filter }: any = parsedQuery as ParsedQuery;

    if (!isEmpty(filter)) {
      const {
        filter: { searchFName, searchLName, dob },
      }: any = parsedQuery as ParsedQuery;

      return res.status(200).send({
        data: resolvePagination(list).filter((user) => {
          return (
            (searchFName && user.firstName == searchFName) ||
            (searchLName && user.lastName == searchLName) ||
            (dob &&
              `${user.dateOfBirth.year}-${
                user.dateOfBirth.month > 9
                  ? user.dateOfBirth.month
                  : `0${user.dateOfBirth.month}`
              }-${
                user.dateOfBirth.day > 9
                  ? user.dateOfBirth.day
                  : `0${user.dateOfBirth.day}`
              }` == dob)
          );
        }),
        totalCount: list.length,
        ...DEFAULT_PAGINATION,
      });
    }

    if (!isEmpty(sorting) || !isEmpty(pagination)) {
      const parsedPagination = parsePagination(
        pagination as ParsedQueryPagination,
      );
      const { sorting }: ParsedQuery = parsedQuery;
      return res.status(200).send({
        data: resolvePagination(
          orderBy(list, [get(sorting, "field")], [get(sorting, "order")]),
          parsedPagination,
        ),
        totalCount: list.length,
        ...parsedPagination,
      });
    }

    return res.status(200).send({
      data: resolvePagination(list),
      totalCount: list.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async details(req: any, res: any) {
    const { params, query } = req;
    const { id } = params;
    // const parsedId = parseInt(id, 10);

    // if (isNaN(parsedId)) {
    //   return res.status(404).send();
    // }

    // const basic = find(list, (item) => item.id === parsedId);
    // const detailsData = find(details, (item) => item.id === parsedId);
    if (id == 3) {
      return res.status(200).send(unverifiedProfileDetails);
    }
    return res.status(200).send(details);
  },

  async recentActivities(req: any, res: any) {
    const { params, query } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return res.status(400).send();
    }

    return res.status(200).send(recentActivities(parsedId));
  },

  async bets(req: any, res: any) {
    const i = req.url.indexOf("?");
    const query = req.url.substr(i + 1);
    const parsedQuery = qs.parse(query, { allowDots: true });
    const { sorting, pagination }: ParsedQuery = parsedQuery as ParsedQuery;

    if (!isEmpty(sorting) || !isEmpty(pagination)) {
      const parsedPagination = parsePagination(
        pagination as ParsedQueryPagination,
      );
      return res.status(200).send({
        data: resolvePagination(
          orderBy(
            betsHistory,
            [get(sorting, "field")],
            [get(sorting, "order")],
          ),
          parsedPagination,
        ),
        totalCount: betsHistory.length,
        ...parsedPagination,
      });
    }

    return res.status(200).send({
      data: resolvePagination(betsHistory),
      totalCount: betsHistory.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async placeBet(req: any, res: any) {
    return bypassRequest(req, res);
  },

  async winAndLoss(req: any, res: any) {
    return res.status(200).send(winAndLossStatistics);
  },

  async transactions(req: any, res: any) {
    const { params } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return res.status(404).send();
    }

    return res.status(200).send({
      data: transactions.map((item) => ({
        ...item,
        punter: parsedId,
      })),
      totalCount: transactions.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async updateLimits(req: any, res: any) {
    return bypassRequest(req, res);
  },

  async updateLifecycle(req: any, res: any) {
    return bypassRequest(req, res);
  },

  async auditLogs(req: any, res: any) {
    const { params } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return res.status(404).send();
    }

    return res.status(200).send({
      data: auditLogs.map((item) => ({
        ...item,
        punterId: parsedId,
      })),
      totalCount: auditLogs.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async sessionHistory(req: any, res: any) {
    const { params } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return res.status(404).send();
    }

    return res.status(200).send({
      data: sessionHistory,
      totalCount: sessionHistory.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async notes(req: any, res: any) {
    const { params } = req;
    const { id } = params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
      return res.status(404).send();
    }

    return res.status(200).send({
      data: notes(),
      totalCount: notes.length,
      ...DEFAULT_PAGINATION,
    });
  },

  async fullSsn(req: any, res: any) {
    return res.status(200).send({
      ssn: Math.random()
        .toString()
        .slice(2, 11),
    });
  },

  async limitsHistory(req: any, res: any) {
    return res.status(200).send(adminLimitsHistory);
  },
};
