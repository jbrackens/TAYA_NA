import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Method, Id } from "@phoenix-ui/utils";
import { useApi } from "../../../services/api/api-service";
import {
  selectCoolOffsHistoryData,
  selectCoolOffsHistoryTableMeta,
  getUserCoolOffsHistorySucceeded,
  getUserCoolOffsHistory,
} from "../../../lib/slices/usersDetailsSlice";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";
import UsersDetailsCoolOffsHistoryList from "../../../components/users/cool-offs-history";

type UsersCoolOffsHistoryProps = {
  id: Id;
};

const UsersCoolOffsHistoryContainer = ({ id }: UsersCoolOffsHistoryProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectCoolOffsHistoryData);
  const { paginationResponse } = useSelector(selectCoolOffsHistoryTableMeta);

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const [refreshData, setRefreshData] = useState(false);
  const [triggerCoolOffsistoryApi, isLoading] = useApi(
    "admin/punters/:id/cool-offs-history",
    Method.GET,
    getUserCoolOffsHistorySucceeded,
  );

  useEffect(() => {
    const fetchUserCoolOffsHistory = async () => {
      try {
        dispatch(getUserCoolOffsHistory());
        await triggerCoolOffsistoryApi(undefined, {
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
    fetchUserCoolOffsHistory();
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
    <UsersDetailsCoolOffsHistoryList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default UsersCoolOffsHistoryContainer;
