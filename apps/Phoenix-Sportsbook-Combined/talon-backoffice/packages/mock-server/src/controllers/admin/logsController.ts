import { DEFAULT_PAGINATION } from "../../utils/crud";
import { auditLogs } from "../../mocked_data/audit-logs";

export default {
  async list(req: any, res: any) {
    const query = req.query || {};
    const filtered = auditLogs.filter((entry) => {
      if (query.action && `${entry.action || ""}` !== `${query.action}`) {
        return false;
      }
      if (query.actorId && `${entry.actorId || ""}` !== `${query.actorId}`) {
        return false;
      }
      if (query.userId && `${entry.userId || ""}` !== `${query.userId}`) {
        return false;
      }
      if (query.targetId && `${entry.targetId || ""}` !== `${query.targetId}`) {
        return false;
      }
      if (query.product && `${entry.product || ""}` !== `${query.product}`) {
        return false;
      }
      return true;
    });
    const sortField = `${query.sortBy || ""}`.trim();
    const sortDirection = `${query.sortDir || ""}`.trim().toLowerCase() === "asc" ? 1 : -1;
    const sorted =
      sortField === "occurredAt"
        ? filtered
            .slice()
            .sort(
              (left, right) =>
                `${left.occurredAt || left.createdAt || ""}`.localeCompare(
                  `${right.occurredAt || right.createdAt || ""}`,
                ) * sortDirection,
            )
        : filtered;

    return res.status(200).send({
      data: sorted,
      totalCount: sorted.length,
      ...DEFAULT_PAGINATION,
    });
  },
};
