import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Method, Id } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
import {
  getUserLimitsHistorySucceeded,
  getUserLimitsHistory,
  selectLimitsHistoryData,
  selectLimitsHistoryTableMeta,
} from "../../../lib/slices/usersDetailsSlice";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";
import UsersDetailsLimitsHistoryList from "../../../components/users/limits-history";

type UsersLimitsHistoryProps = {
  id: Id;
};

const UsersLimitsHistoryContainer = ({ id }: UsersLimitsHistoryProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectLimitsHistoryData);
  const { paginationResponse } = useSelector(selectLimitsHistoryTableMeta);

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const [refreshData, setRefreshData] = useState(false);
  const [triggerLimitsHistoryApi, isLoading] = useApi(
    "admin/punters/:id/limits-history",
    Method.GET,
    getUserLimitsHistorySucceeded,
  );

  useEffect(() => {
    const fetchUserLimitsHistory = async () => {
      try {
        dispatch(getUserLimitsHistory());
        await triggerLimitsHistoryApi(undefined, {
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
    fetchUserLimitsHistory();
    setRefreshData(false);
  }, [p, limit, refreshData]);

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
    <UsersDetailsLimitsHistoryList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default UsersLimitsHistoryContainer;
