import { isNaN } from "lodash";
import { DEFAULT_PAGINATION } from "../../utils/crud";
import { auditLogs } from "../../mocked_data/audit-logs";

export default {
  async list(req: any, res: any) {
    const { params } = req;
    const { id } = params;

    return res.status(200).send({
      data: auditLogs,
      totalCount: auditLogs.length,
      ...DEFAULT_PAGINATION,
    });
  },
};
