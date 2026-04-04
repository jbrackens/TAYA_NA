import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "i18n";
import AuditLogsList from "../../components/audit-logs";
import {
  getList,
  getListSucceeded,
  selectData,
  selectTableMeta,
} from "../../lib/slices/logsSlice";
import { useApi } from "../../services/api/api-service";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";

const AuditLogsContainer = () => {
  const { t } = useTranslation("page-audit-logs");
  const dispatch = useDispatch();
  const records = useSelector(selectData);
  const { paginationResponse } = useSelector(selectTableMeta);
  const [triggerAuditLogsListApi, isLoading] = useApi(
    "admin/audit-logs",
    Method.GET,
    getListSucceeded,
  );

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const handleTableChange = (pagination: any, _filters: any, _sorting: any) => {
    router.push(
      {
        query: {
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  useEffect((): any => {
    const fetchAuditLogs = async () => {
      try {
        dispatch(getList());
        await triggerAuditLogsListApi(undefined, {
          query: {
            pagination: {
              currentPage: p ? p : 1,
              itemsPerPage: limit ? limit : 20,
            },
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchAuditLogs();
  }, [p, limit]);

  const columns = [
    {
      index: 1,
      value: {
        title: t("HEADER_PUNTER"),
        // width: 160,
        // ellipsis: true,
        dataIndex: "punterId",
      },
    },
  ];

  return (
    <AuditLogsList
      data={records}
      additionalColumns={columns}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default AuditLogsContainer;
