import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useApi } from "../../../services/api/api-service";
import UsersDetailsAuditLogsList from "../../../components/users/audit-logs";
import {
  getUserAuditLogsSucceeded,
  selectAuditLogsTableMeta,
  selectAuditLogsData,
  getUserAuditLogs,
} from "../../../lib/slices/usersDetailsSlice";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";

type UsersDetailsAuditLogsContainerProps = {
  id: string | string[] | number | undefined;
};

const UsersDetailsAuditLogsContainer = ({
  id,
}: UsersDetailsAuditLogsContainerProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectAuditLogsData);
  const { paginationResponse } = useSelector(selectAuditLogsTableMeta);
  const [triggerAuditLogApi, isLoading] = useApi(
    "admin/punters/:id/logs",
    Method.GET,
    getUserAuditLogsSucceeded,
  );

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  useEffect((): any => {
    const fetchUserAuditLog = async () => {
      try {
        dispatch(getUserAuditLogs());
        await triggerAuditLogApi(undefined, {
          id,
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
    fetchUserAuditLog();
  }, [p, limit]);

  const handleTableChange = (
    pagination: TablePagination,
    _filters: TableFilters,
    _sorting: TableSorting,
  ) => {
    router.push(
      {
        query: {
          ...router.query,
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  return (
    <UsersDetailsAuditLogsList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default UsersDetailsAuditLogsContainer;
