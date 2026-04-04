import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Method, Id } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
import {
  getUserSessionHistorySucceeded,
  selectSessionHistoryTableMeta,
  selectSessionHistoryData,
  getUserSessionHistory,
} from "../../../lib/slices/usersDetailsSlice";
import UsersDetailsSessionHistoryList from "../../../components/users/session-history";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";

type UsersDetailsSessionHistoryContainerProps = {
  id: Id;
};

const UsersDetailsSessionHistoryContainer = ({
  id,
}: UsersDetailsSessionHistoryContainerProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectSessionHistoryData);
  const { paginationResponse } = useSelector(selectSessionHistoryTableMeta);

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const [refreshData, setRefreshData] = useState(false);
  const [triggerSessionHistoryApi, isLoading] = useApi(
    "admin/punters/:id/session-history",
    Method.GET,
    getUserSessionHistorySucceeded,
  );

  useEffect((): any => {
    const fetchUserSessionHistory = async () => {
      try {
        dispatch(getUserSessionHistory());
        await triggerSessionHistoryApi(undefined, {
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
    fetchUserSessionHistory();
    setRefreshData(false);
  }, [p, limit, refreshData]);

  const setRefreshDataFunc = (refresh: boolean) => {
    setRefreshData(refresh);
  };

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
    <UsersDetailsSessionHistoryList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
      setRefreshDataFunc={setRefreshDataFunc}
      userId={id}
    />
  );
};

export default UsersDetailsSessionHistoryContainer;
